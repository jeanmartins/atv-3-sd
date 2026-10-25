# Monitoramento industrial com MQTT

Implementação em Go do simulador de sensores, serviço CAT (Compute Average Temperature) e serviço Alarms com interface web em tempo real. O broker é o Eclipse Mosquitto e o sensor real é a temperatura da bateria de um celular Android.

## Requisitos

- Go 1.22 ou superior
- Docker Desktop com Docker Compose
- Navegador web
- Android com Termux e Termux:API para a etapa do sensor real

## Arquitetura e tópicos

```text
Sensores simulados ─┐
                    ├─> industrial/boiler/temperature/+ ─> CAT
Celular Android ────┘                                      │
                                                          ├─> industrial/boiler/cat/average
                                                          └─> industrial/boiler/events/+ ─> Alarms GUI
```

Todas as publicações usam MQTT QoS 1. A janela oficial do CAT é de 120 segundos.

## Instalação

Na pasta `05_monitoramento_mqtt`, baixe as dependências Go:

```powershell
go mod tidy
```

Suba o broker:

```powershell
docker compose up -d
docker compose logs -f mosquitto
```

## Execução oficial

Abra três terminais nesta pasta.

Terminal 1 — CAT:

```powershell
go run ./cmd/cat
```

Terminal 2 — interface Alarms:

```powershell
go run ./cmd/alarms
```

Abra `http://localhost:8080` no navegador.

Terminal 3 — três sensores, publicação a cada 60 segundos:

```powershell
go run ./cmd/sensor-simulator --sensors 3 --interval 60s
```

No terminal do simulador, use:

- `sudden-rise`: publica imediatamente um lote com aumento brusco;
- `high-temperature`: publica imediatamente um lote extremo para elevar a média acima de 200 °C;
- `normal`: publica imediatamente temperaturas normais;
- `quit`: encerra o simulador.

## Modo rápido para desenvolvimento e vídeo

Para não aguardar vários minutos durante a demonstração, reduza a janela somente no terminal do CAT:

```powershell
$env:CAT_WINDOW_SECONDS="12"
go run ./cmd/cat
```

Execute o simulador com intervalo de dois segundos:

```powershell
go run ./cmd/sensor-simulator --sensors 3 --interval 2s
```

Espere aproximadamente 12 segundos, use `sudden-rise`, espere a próxima avaliação e depois use `high-temperature`. Antes da entrega, demonstre ou registre também que a configuração padrão usa 60 e 120 segundos.

## Celular Android como sensor real

Esta opção usa a temperatura física da bateria e não exige compilar Go no celular.

1. Instale o Termux pelo F-Droid, além do aplicativo complementar Termux:API.
2. No Termux, instale os comandos necessários:

```bash
pkg update
pkg install termux-api jq mosquitto
```

3. Copie `sensor_real_mobile/publicar_temperatura.sh` para o Termux e permita sua execução:

```bash
chmod +x publicar_temperatura.sh
```

4. Descubra o IPv4 do computador com `ipconfig`. Celular e computador devem estar na mesma rede Wi-Fi.
5. Libere a porta TCP 1883 no Firewall do Windows apenas para redes privadas.
6. Execute, substituindo o endereço pelo IP do computador:

```bash
./publicar_temperatura.sh 192.168.1.10 mobile-jean
```

O CAT registrará uma mensagem com origem `android-battery` a cada 60 segundos. O Mosquitto está anônimo para facilitar a atividade em uma rede local; não use essa configuração exposta à internet.

## Configuração

| Variável | Padrão | Finalidade |
|---|---:|---|
| `MQTT_BROKER` | `tcp://localhost:1883` | Endereço MQTT usado pelas aplicações Go |
| `CAT_WINDOW_SECONDS` | `120` | Tamanho da janela temporal |
| `CAT_EVALUATION_SECONDS` | `1` | Intervalo de recálculo da média |
| `ALARMS_HTTP_ADDRESS` | `:8080` | Endereço HTTP da interface |

## Validação manual

1. Confirme no CAT as leituras normais dos sensores.
2. Confirme que a GUI atualiza a média sem recarregar a página.
3. Injete `sudden-rise` e verifique o cartão amarelo.
4. Injete `high-temperature` e verifique o cartão vermelho, que permanece ativo enquanto a média estiver acima de 200 °C.
5. Aguarde a saída das leituras extremas da janela e confirme que o cartão volta ao estado normal.
6. Execute o publicador Android e confirme a origem `android-battery` no CAT.
7. Reinicie um serviço para comprovar a reconexão MQTT.

## Captura no Wireshark

Inicie a captura antes de subir os serviços e use o filtro:

```text
mqtt || tcp.port == 1883
```

A captura `docs/wireshark/05_mqtt.pcapng` deve mostrar `CONNECT`, `CONNACK`, `SUBSCRIBE`, `SUBACK`, `PUBLISH` e `PUBACK`, incluindo uma publicação originada pelo IP do celular.
