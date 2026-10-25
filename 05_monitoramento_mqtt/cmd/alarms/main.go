package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"atv3sd/monitoramento-mqtt/internal/contracts"
	"atv3sd/monitoramento-mqtt/internal/mqttutil"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

//go:embed web/index.html
var webFiles embed.FS

type dashboardMessage struct {
	Kind    string          `json:"kind"`
	Topic   string          `json:"topic"`
	Payload json.RawMessage `json:"payload"`
}

type hub struct {
	mu      sync.Mutex
	clients map[chan []byte]struct{}
	history [][]byte
}

func newHub() *hub {
	return &hub{clients: make(map[chan []byte]struct{})}
}

func (h *hub) broadcast(data []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.history = append(h.history, append([]byte(nil), data...))
	if len(h.history) > 100 {
		h.history = h.history[len(h.history)-100:]
	}
	for client := range h.clients {
		select {
		case client <- data:
		default:
		}
	}
}

func (h *hub) events(response http.ResponseWriter, request *http.Request) {
	flusher, ok := response.(http.Flusher)
	if !ok {
		http.Error(response, "streaming indisponível", http.StatusInternalServerError)
		return
	}
	response.Header().Set("Content-Type", "text/event-stream")
	response.Header().Set("Cache-Control", "no-cache")
	response.Header().Set("Connection", "keep-alive")

	client := make(chan []byte, 16)
	h.mu.Lock()
	h.clients[client] = struct{}{}
	history := append([][]byte(nil), h.history...)
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.clients, client)
		h.mu.Unlock()
	}()

	for _, data := range history {
		fmt.Fprintf(response, "data: %s\n\n", data)
	}
	flusher.Flush()

	keepAlive := time.NewTicker(20 * time.Second)
	defer keepAlive.Stop()
	for {
		select {
		case data := <-client:
			fmt.Fprintf(response, "data: %s\n\n", data)
			flusher.Flush()
		case <-keepAlive.C:
			fmt.Fprint(response, ": keep-alive\n\n")
			flusher.Flush()
		case <-request.Context().Done():
			return
		}
	}
}

func main() {
	updates := newHub()
	handler := func(_ mqtt.Client, message mqtt.Message) {
		if !json.Valid(message.Payload()) {
			log.Printf("JSON inválido recebido em %s", message.Topic())
			return
		}
		kind := "average"
		if message.Topic() != contracts.AverageTopic {
			kind = "alarm"
		}
		envelope := dashboardMessage{Kind: kind, Topic: message.Topic(), Payload: append(json.RawMessage(nil), message.Payload()...)}
		data, err := json.Marshal(envelope)
		if err != nil {
			log.Printf("erro ao preparar atualização: %v", err)
			return
		}
		updates.broadcast(data)
		log.Printf("atualização recebida em %s", message.Topic())
	}

	onConnect := func(client mqtt.Client) {
		for _, topic := range []string{contracts.EventWildcard, contracts.AverageTopic} {
			token := client.Subscribe(topic, 1, handler)
			token.Wait()
			if err := token.Error(); err != nil {
				log.Printf("falha ao assinar %s: %v", topic, err)
			} else {
				log.Printf("inscrito em %s", topic)
			}
		}
	}

	client, err := mqttutil.NewClient(fmt.Sprintf("alarms-gui-%d", time.Now().UnixNano()), onConnect)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(250)

	webRoot, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/events", updates.events)
	mux.Handle("/", http.FileServer(http.FS(webRoot)))
	address := os.Getenv("ALARMS_HTTP_ADDRESS")
	if address == "" {
		address = ":8080"
	}
	log.Printf("GUI disponível em http://localhost%s", address)
	if err := http.ListenAndServe(address, mux); err != nil {
		log.Fatal(err)
	}
}
