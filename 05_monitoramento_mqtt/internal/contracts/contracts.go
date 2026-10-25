package contracts

import "time"

const (
	TemperatureWildcard  = "industrial/boiler/temperature/+"
	TemperaturePrefix    = "industrial/boiler/temperature/"
	AverageTopic         = "industrial/boiler/cat/average"
	EventWildcard        = "industrial/boiler/events/+"
	SuddenRiseTopic      = "industrial/boiler/events/sudden-rise"
	HighTemperatureTopic = "industrial/boiler/events/high-temperature"
)

type TemperatureReading struct {
	SensorID    string  `json:"sensor_id"`
	Temperature float64 `json:"temperature"`
	Unit        string  `json:"unit"`
	Timestamp   string  `json:"timestamp"`
	Source      string  `json:"source"`
}

type AverageMessage struct {
	Average       float64 `json:"average"`
	ReadingCount  int     `json:"reading_count"`
	WindowSeconds int     `json:"window_seconds"`
	Timestamp     string  `json:"timestamp"`
}

type AlarmEvent struct {
	Event           string  `json:"event"`
	CurrentAverage  float64 `json:"current_average"`
	PreviousAverage float64 `json:"previous_average"`
	Delta           float64 `json:"delta"`
	WindowSeconds   int     `json:"window_seconds"`
	Timestamp       string  `json:"timestamp"`
}

func TimestampNow() string {
	return time.Now().UTC().Format(time.RFC3339)
}
