# 🌐 Atividade Prática AT03: Sistemas Distribuídos e Redes de Comunicação

**Programa de Pós-Graduação / Mestrado em Ciência da Computação**  
**Disciplina:** CKP7500 - Sistemas Distribuídos e Redes de Comunicação  
**Professores:** Prof. Windson Viana de Carvalho e Prof. Fernando Antonio Mota Trinta  

---

## 📌 Visão Geral do Projeto

Este repositório consolida o desenvolvimento prático da **Atividade AT03**, cujo objetivo é projetar, implementar, medir e comparar empiricamente cinco paradigmas fundamentais de comunicação distribuída:

1. **Sockets TCP Puros**
2. **Java RMI (Remote Method Invocation)**
3. **JSON-RPC**
4. **HTTP-REST com Política de Retentativa Resiliente (Retry)**
5. **Publish-Subscribe via MQTT** (com processamento temporal de médias, alarmes e integração de sensor real)

Para cada paradigma, as implementações atendem às exigências de:
* Suporte às 4 operações básicas (`+`, `-`, `*`, `/`).
* Suporte a expressões aritméticas complexas com parênteses em duas abordagens:
  * **Abordagem 1:** Decomposição e resolução passo a passo no cliente.
  * **Abordagem 2:** Envio da expressão integral para cálculo remoto no servidor.
* **Comentários explicativos linha a linha** nas classes e instruções de rede.
* Capturas e análise de tráfego de pacotes via **Wireshark**.

---

## 📂 Estrutura do Repositório

```plaintext
.
├── 01_calculadora_socket/       # Módulo 1: Calculadora Distribuída via Sockets TCP (CLI & GUI)
├── 02_calculadora_rmi/          # Módulo 2: Calculadora Distribuída via Java RMI
├── 03_calculadora_jsonrpc/      # Módulo 3: Calculadora Distribuída via JSON-RPC
├── 04_calculadora_rest/         # Módulo 4: Calculadora HTTP-REST com política de Retry
├── 05_monitoramento_mqtt/       # Módulo 5: Ecossistema MQTT (Broker, CAT, Alarms GUI, Sensores)
├── docs/                        # Relatório Comparativo (PDF) e capturas do Wireshark (.pcapng)
├── PLANO_DE_TRABALHO.md         # Plano detalhado de execução, divisão e regras da pós
└── abrir_calculadora.bat        # Inicializador rápido da interface gráfica da Calculadora Socket
```

---

## 🚀 Como Executar o Módulo 1 (Calculadora Socket TCP)

Consulte a documentação completa em [`01_calculadora_socket/README.md`](01_calculadora_socket/README.md).

### 1. Compilação
```bash
cd 01_calculadora_socket/src
javac Calculadora.java CalculadoraServerSocket.java CalculadoraClientSocket.java CalculadoraGUI.java
```

### 2. Iniciar o Servidor
```bash
java CalculadoraServerSocket
```

### 3. Iniciar o Cliente
* **Interface Gráfica (Recomendada):**
  ```bash
  java CalculadoraGUI
  ```
  *(Ou execute o arquivo `abrir_calculadora.bat` na raiz)*
* **Modo Terminal:**
  ```bash
  java CalculadoraClientSocket
  ```
