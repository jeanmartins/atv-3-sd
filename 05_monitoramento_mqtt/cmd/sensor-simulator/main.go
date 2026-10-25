package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"atv3sd/monitoramento-mqtt/internal/contracts"
	"atv3sd/monitoramento-mqtt/internal/mqttutil"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type simulator struct {
	mu       sync.RWMutex
	mode     string
	baseTemp float64
}

func (s *simulator) setMode(mode string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.mode = mode
}

func (s *simulator) temperatures(sensorCount int) ([]float64, string) {
	s.mu.RLock()
	mode := s.mode
	base := s.baseTemp
	s.mu.RUnlock()

	values := make([]float64, sensorCount)
	for index := range values {
		switch mode {
		case "sudden-rise":
			values[index] = base + 50 + rand.Float64()*2
		case "high-temperature":
			values[index] = 1000 + rand.Float64()*10
		default:
			values[index] = base - 2 + rand.Float64()*4
		}
	}
	if mode != "normal" {
		s.setMode("normal")
	}
	return values, mode
}

func main() {
	sensorCount := flag.Int("sensors", 3, "quantidade de sensores simulados")
	interval := flag.Duration("interval", 60*time.Second, "intervalo entre publicações")
	baseTemp := flag.Float64("base-temperature", 90, "temperatura normal de referência")
	flag.Parse()

	if *sensorCount < 1 || *interval <= 0 {
		log.Fatal("sensors deve ser >= 1 e interval deve ser positivo")
	}

	client, err := mqttutil.NewClient(fmt.Sprintf("sensor-simulator-%d", time.Now().UnixNano()), nil)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(250)

	sim := &simulator{mode: "normal", baseTemp: *baseTemp}
	commands := make(chan string)
	go readCommands(commands)

	interrupts := make(chan os.Signal, 1)
	signal.Notify(interrupts, os.Interrupt, syscall.SIGTERM)

	log.Printf("simulando %d sensores a cada %s", *sensorCount, *interval)
	log.Println("comandos: sudden-rise | high-temperature | normal | quit")
	publishBatch(client, sim, *sensorCount)
	ticker := time.NewTicker(*interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			publishBatch(client, sim, *sensorCount)
		case command := <-commands:
			switch command {
			case "sudden-rise", "high-temperature":
				sim.setMode(command)
				publishBatch(client, sim, *sensorCount)
			case "normal":
				sim.setMode("normal")
				publishBatch(client, sim, *sensorCount)
			case "quit", "exit":
				return
			default:
				log.Printf("comando desconhecido: %s", command)
			}
		case <-interrupts:
			return
		}
	}
}

func readCommands(commands chan<- string) {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		commands <- strings.ToLower(strings.TrimSpace(scanner.Text()))
	}
}

func publishBatch(client mqtt.Client, sim *simulator, sensorCount int) {
	values, mode := sim.temperatures(sensorCount)
	for index, temperature := range values {
		sensorID := fmt.Sprintf("sim-%02d", index+1)
		reading := contracts.TemperatureReading{
			SensorID:    sensorID,
			Temperature: temperature,
			Unit:        "C",
			Timestamp:   contracts.TimestampNow(),
			Source:      "simulated",
		}
		payload, err := json.Marshal(reading)
		if err != nil {
			log.Printf("erro ao serializar %s: %v", sensorID, err)
			continue
		}
		topic := contracts.TemperaturePrefix + sensorID
		if err := mqttutil.PublishJSON(client, topic, payload); err != nil {
			log.Printf("erro ao publicar %s: %v", sensorID, err)
			continue
		}
		log.Printf("%-8s temperatura=%6.2f°C modo=%s", sensorID, temperature, mode)
	}
}
