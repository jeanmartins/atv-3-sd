# Guia Wireshark — Módulos 1 (Socket) e 2 (RMI)

Wireshark é uma "câmera de segurança da rede": ele grava todas as mensagens que passam e mostra uma por uma.
Como cliente e servidor rodam no **seu próprio PC**, a conversa passa pelo "Npcap Loopback Adapter".

**O que o professor quer:** capturas do tráfego + uma explicação do que se vê (vai para o relatório).

---

## PARTE A — Módulo 1 (Socket): a captura JÁ EXISTE

Você tinha gravado `capturas.pcapng` (cópia em `docs/wireshark/01_socket.pcapng`). Ela tinha 1043 pacotes, quase todos lixo (outros programas do PC). Eu extraí só a conversa da porta 9090:

**Arquivo para usar: `docs/wireshark/01_socket_limpo.pcapng`** (154 linhas, só a calculadora).

### Passo 1 — Abrir
1. Abra o Wireshark.
2. Menu **File → Open** → escolha `docs/wireshark/01_socket_limpo.pcapng`.

### Passo 2 — Ver o "aperto de mão" do TCP
1. Na barra de filtro (em cima, verde) digite `tcp.stream == 0` e tecle Enter.
2. Você vai ver, de cima para baixo:
   - `[SYN]` → cliente: "quero conversar"
   - `[SYN, ACK]` → servidor: "ok, também quero"
   - `[ACK]` → cliente: "combinado"  ← esses 3 são o **three-way handshake**
   - vários `[PSH, ACK]` → os dados indo e voltando
   - `[FIN, ACK]` → alguém diz "terminei" (encerramento)
3. **Tire um print** (tecla `Win + Shift + S`) e salve em `docs/wireshark/prints/01_handshake.png`.

### Passo 3 — Ver o conteúdo da mensagem
1. Clique com o botão direito em qualquer pacote `PSH` → **Follow → TCP Stream**.
2. Abre uma janelinha com o texto trocado. O stream 0 é a **Abordagem 2** (expressão inteira): o cliente manda `5`, depois `10+5`, e o servidor responde `15.0`.
3. **Print** → `docs/wireshark/prints/01_conteudo.png`.

### Passo 4 — Comparar Abordagem 1 e 2 (ouro para o relatório)
Os 4 streams da captura:

| Stream | O que foi enviado | Abordagem |
|---|---|---|
| 0 (porta 53211) | `5` + `10+5` | **2** – expressão inteira numa conexão só |
| 1 (porta 53213) | `5` + `(20*2)-16` | **2** – idem |
| 2 (porta 53220) | `3` + `20.0` + `2.0` → resposta `10.0` | **1** – um passo (20 / 2) |
| 3 (porta 53221) | `4` + `10.0` + `2.0` → resposta `20.0` | **1** – outro passo (10 * 2), como em `20 / 2 * 2` |

Conclusão para escrever: na Abordagem 1 cada operação abre **uma conexão TCP nova** (cada uma com handshake + FIN); na Abordagem 2 é **uma conexão só** com a expressão inteira.
Streams 2 e 3 são 2 conexões separadas = 2 chamadas remotas (aparecem a ~0,001 s uma da outra).

### Descoberta curiosa (vale um parágrafo no relatório)
Repare que cada `PSH` carrega só **1 byte** (um caractere!). Isso acontece porque `DataOutputStream.writeBytes()` envia byte a byte, sem buffer. Resultado: a conta `10+5` gerou 32 pacotes no total (stream 0). É um ótimo exemplo de **overhead de rede** para comparar com RMI e HTTP.
Para ver: filtro `tcp.len > 0`.

### Se quiser refazer a captura do zero (opcional)
Veja o Passo 1 da Parte B, trocando o filtro de captura por `tcp port 9090`.

---

## PARTE B — Módulo 2 (RMI): capturar do zero

### Passo 1 — Preparar o Wireshark
1. Abra o Wireshark **como administrador** (botão direito → Executar como administrador).
2. Na tela inicial, dê **duplo clique em "Adapter for loopback traffic capture"** (ou "Npcap Loopback Adapter"). É a única que vê conversas do PC com ele mesmo.
3. Já começa a gravar. Na barra de filtro digite: `tcp.port == 1099 || tcp.port == 1100` e tecle Enter.

### Passo 2 — Rodar o RMI (3 janelas de terminal)
Abra o terminal na pasta do projeto. Janela 1:
```
cd 02_calculadora_rmi/src
javac CalculadoraServidor.java CalculadoraCliente.java
java CalculadoraServidor
```
Deve aparecer "Servidor Calculadora RMI pronto". **Deixe aberta.**

Janela 2:
```
cd 02_calculadora_rmi/src
java CalculadoraCliente
```
Digite nesta ordem (uma coisa por linha):
1. `1` → `10` → `+` → `5`  (resultado 15.0)
2. `2` → `(10 + 15) * 4`  (Abordagem 1: 2 chamadas)
3. `3` → `(10 + 15) * 4`  (Abordagem 2: 1 chamada)
4. `0` para sair.

### Passo 3 — Parar e salvar
1. No Wireshark clique no **quadrado vermelho** (parar).
2. **File → Save As** → `docs/wireshark/02_rmi.pcapng`.

### Passo 4 — O que mostrar no relatório
Procure e tire print de:
1. **Porta 1099 (registry):** pacotes com a coluna Protocol = `RMI`/`JRMI`. É o `lookup("calculadora")`: o cliente pergunta "onde está a calculadora?".
2. **Porta 1100 (objeto):** é onde as chamadas de verdade acontecem. Clique em um pacote → **Follow → TCP Stream**: você verá bytes estranhos misturados com textos como `ICalculadora`, `soma`, `java.lang`. É a **serialização binária Java**: não é legível como o texto do Socket.
3. Compare o **tamanho** (coluna Length) de uma soma no RMI com a do Socket. RMI é bem maior (cabeçalhos + serialização) — esse é o ponto sobre **overhead**.

> Dica: para contar bytes de uma conversa: **Statistics → Conversations → aba TCP**.

---

## O que escrever no relatório (resumo para copiar a ideia)

| | Socket | RMI |
|---|---|---|
| Formato | Texto simples que **nós** inventamos | Binário Java (padrão do RMI) |
| Quem entende | Qualquer linguagem | Só Java |
| Conexões | 1 nova por chamada (nosso código) | Reaproveita conexão |
| Procurar serviço | Porta fixa decorada | `rmiregistry` (porta 1099) por nome |
| Overhead | Baixo em bytes (mas 1 byte/pacote!) | Maior por pacote |

*(Confira com a sua captura real antes de afirmar — números e comportamento aparecem nos seus prints.)*
