package mqttutil

import (
	"fmt"
	"log"
	"os"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

func BrokerURL() string {
	if value := os.Getenv("MQTT_BROKER"); value != "" {
		return value
	}
	return "tcp://localhost:1883"
}

func NewClient(clientID string, onConnect mqtt.OnConnectHandler) (mqtt.Client, error) {
	options := mqtt.NewClientOptions()
	options.AddBroker(BrokerURL())
	options.SetClientID(clientID)
	options.SetCleanSession(true)
	options.SetAutoReconnect(true)
	options.SetConnectRetry(true)
	options.SetConnectRetryInterval(2 * time.Second)
	if onConnect != nil {
		options.SetOnConnectHandler(onConnect)
	}
	options.SetConnectionLostHandler(func(_ mqtt.Client, err error) {
		log.Printf("conexão MQTT perdida: %v", err)
	})

	client := mqtt.NewClient(options)
	token := client.Connect()
	if !token.WaitTimeout(10 * time.Second) {
		return nil, fmt.Errorf("tempo esgotado ao conectar em %s", BrokerURL())
	}
	if err := token.Error(); err != nil {
		return nil, fmt.Errorf("conexão com %s: %w", BrokerURL(), err)
	}
	return client, nil
}

func PublishJSON(client mqtt.Client, topic string, payload []byte) error {
	token := client.Publish(topic, 1, false, payload)
	if !token.WaitTimeout(5 * time.Second) {
		return fmt.Errorf("tempo esgotado ao publicar em %s", topic)
	}
	return token.Error()
}
