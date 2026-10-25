#!/data/data/com.termux/files/usr/bin/bash

# Endereço IP do computador que executa o Mosquitto.
BROKER_IP="${1:?Uso: ./publicar_temperatura.sh IP_DO_COMPUTADOR [sensor_id]}"
# Nome usado para identificar este celular no tópico e no payload.
SENSOR_ID="${2:-mobile-android}"

while true; do
  # O Termux:API lê a temperatura real da bateria, informada em graus Celsius.
  TEMPERATURE="$(termux-battery-status | jq -r '.temperature')"
  # O Android fornece a hora atual em UTC no formato aceito pelo serviço CAT.
  TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  # O payload segue exatamente o mesmo contrato utilizado pelos sensores em Go.
  PAYLOAD="$(jq -nc --arg id "$SENSOR_ID" --argjson temperature "$TEMPERATURE" --arg timestamp "$TIMESTAMP" '{sensor_id:$id,temperature:$temperature,unit:"C",timestamp:$timestamp,source:"android-battery"}')"
  # O mosquitto_pub envia a leitura com QoS 1 ao broker executado no computador.
  mosquitto_pub -h "$BROKER_IP" -p 1883 -q 1 -t "industrial/boiler/temperature/$SENSOR_ID" -m "$PAYLOAD"
  echo "$TIMESTAMP temperatura publicada: $TEMPERATURE °C"
  # O requisito da atividade determina uma publicação a cada 60 segundos.
  sleep 60
done
