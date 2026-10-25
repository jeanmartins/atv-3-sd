package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"atv3sd/monitoramento-mqtt/internal/contracts"
	"atv3sd/monitoramento-mqtt/internal/mqttutil"
	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type storedReading struct {
	receivedAt  time.Time
	temperature float64
}

type catService struct {
	mu                  sync.Mutex
	readings            []storedReading
	previousAverage     float64
	hasPreviousAverage  bool
	highTemperatureOpen bool
	window              time.Duration
	client              mqtt.Client
}

func main() {
	windowSeconds := envPositiveInt("CAT_WINDOW_SECONDS", 120)
	evaluationSeconds := envPositiveInt("CAT_EVALUATION_SECONDS", 1)
	service := &catService{window: time.Duration(windowSeconds) * time.Second}

	onConnect := func(client mqtt.Client) {
		token := client.Subscribe(contracts.TemperatureWildcard, 1, service.handleTemperature)
		token.Wait()
		if err := token.Error(); err != nil {
			log.Printf("falha ao assinar %s: %v", contracts.TemperatureWildcard, err)
			return
		}
		log.Printf("inscrito em %s", contracts.TemperatureWildcard)
	}

	client, err := mqttutil.NewClient(fmt.Sprintf("cat-service-%d", time.Now().UnixNano()), onConnect)
	if err != nil {
		log.Fatal(err)
	}
	service.client = client
	defer client.Disconnect(250)

	ticker := time.NewTicker(time.Duration(evaluationSeconds) * time.Second)
	defer ticker.Stop()
	interrupts := make(chan os.Signal, 1)
	signal.Notify(interrupts, os.Interrupt, syscall.SIGTERM)
	log.Printf("CAT ativo: janela=%ds avaliação=%ds", windowSeconds, evaluationSeconds)

	for {
		select {
		case now := <-ticker.C:
			service.evaluate(now)
		case <-interrupts:
			return
		}
	}
}

func (s *catService) handleTemperature(_ mqtt.Client, message mqtt.Message) {
	var reading contracts.TemperatureReading
	if err := json.Unmarshal(message.Payload(), &reading); err != nil {
		log.Printf("payload inválido em %s: %v", message.Topic(), err)
		return
	}
	if reading.SensorID == "" || reading.Unit != "C" || math.IsNaN(reading.Temperature) || math.IsInf(reading.Temperature, 0) || reading.Temperature < -100 || reading.Temperature > 1500 {
		log.Printf("leitura rejeitada em %s: sensor, unidade ou temperatura inválida", message.Topic())
		return
	}

	s.mu.Lock()
	s.readings = append(s.readings, storedReading{receivedAt: time.Now(), temperature: reading.Temperature})
	s.mu.Unlock()
	log.Printf("recebido %-16s %7.2f°C (%s)", reading.SensorID, reading.Temperature, reading.Source)
}

func (s *catService) evaluate(now time.Time) {
	s.mu.Lock()
	cutoff := now.Add(-s.window)
	firstValid := 0
	for firstValid < len(s.readings) && s.readings[firstValid].receivedAt.Before(cutoff) {
		firstValid++
	}
	s.readings = s.readings[firstValid:]
	if len(s.readings) == 0 {
		s.mu.Unlock()
		return
	}

	var sum float64
	for _, reading := range s.readings {
		sum += reading.temperature
	}
	current := sum / float64(len(s.readings))
	previous := s.previousAverage
	hadPrevious := s.hasPreviousAverage
	delta := current - previous
	shouldPublishSudden := hadPrevious && delta >= 5
	shouldPublishHigh := current > 200 && !s.highTemperatureOpen
	s.highTemperatureOpen = current > 200
	s.previousAverage = current
	s.hasPreviousAverage = true
	count := len(s.readings)
	s.mu.Unlock()

	average := contracts.AverageMessage{Average: current, ReadingCount: count, WindowSeconds: int(s.window.Seconds()), Timestamp: contracts.TimestampNow()}
	publish(s.client, contracts.AverageTopic, average)
	log.Printf("média=%7.2f°C leituras=%d delta=%+.2f°C", current, count, delta)

	if shouldPublishSudden {
		event := contracts.AlarmEvent{Event: "sudden_temperature_rise", CurrentAverage: current, PreviousAverage: previous, Delta: delta, WindowSeconds: int(s.window.Seconds()), Timestamp: contracts.TimestampNow()}
		publish(s.client, contracts.SuddenRiseTopic, event)
	}
	if shouldPublishHigh {
		event := contracts.AlarmEvent{Event: "high_temperature", CurrentAverage: current, PreviousAverage: previous, Delta: delta, WindowSeconds: int(s.window.Seconds()), Timestamp: contracts.TimestampNow()}
		publish(s.client, contracts.HighTemperatureTopic, event)
	}
}

func publish(client mqtt.Client, topic string, value any) {
	payload, err := json.Marshal(value)
	if err != nil {
		log.Printf("erro ao serializar %s: %v", topic, err)
		return
	}
	if err := mqttutil.PublishJSON(client, topic, payload); err != nil {
		log.Printf("erro ao publicar %s: %v", topic, err)
	}
}

func envPositiveInt(name string, fallback int) int {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		log.Fatalf("%s deve ser um inteiro positivo", name)
	}
	return parsed
}
