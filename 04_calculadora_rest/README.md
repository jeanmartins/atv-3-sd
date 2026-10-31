# 🧮 04_calculadora_rest: Calculadora Distribuída HTTP-REST com Retry

Este módulo implementa a **Calculadora Distribuída em HTTP-REST simples**, desenvolvida integralmente em **JavaScript (Node.js)**, atendendo a todos aos requisitos da atividade 3.

---

## 🚀 Funcionalidades e Requisitos presentes nesse módulo

1. **Interfaces Gráficas (Visual e Textual):**
   - **Interface Gráfica Web Visual (GUI):** Acessível via navegador em `http://localhost:3000`, construída com visual moderno em tema escuro, teclado numérico, alternância de modos, painel de telemetria de rede e simulador de Retry em tempo real.
   - **Interface Gráfica Textual (CLI):** Menu de terminal interativo colorido e validado (`node client/client.js`), permitindo executar cálculos, configurar parâmetros de rede e testar cenários de falha.
2. **Operações Individuais e Expressões com Parênteses:**
   - Suporte completo às 4 operações básicas: Soma (`+`), Subtração (`-`), Multiplicação (`*`) e Divisão (`/`, com validação de divisão por zero).
   - Suporte a expressões com parênteses (ex.: `(10 + 15) * 4`, `100 / (2 + 3) * 2`):
     - **Abordagem 1 (Decomposição no Cliente):** O cliente analisa a expressão (usando o algoritmo Shunting-yard) e dispara chamadas remotas HTTP POST atômicas para cada operador no servidor, exibindo o log de cada passo intermediário.
     - **Abordagem 2 (Cálculo no Servidor):** O cliente envia a string da expressão inteira via `POST /expressao`, e o servidor processa com seu parser seguro e devolve o resultado consolidado.
3. **Código de Comunicação Totalmente Comentado Linha a Linha:**
   - Todas as linhas das classes e manipuladores de comunicação (`server/server.js` e `client/CalculadoraRest.js`) possuem comentários explicativos detalhando sua função técnica.
4. **Política de RETRY (Wait Ts and Retry):**
   - Implementada no cliente HTTP-REST (`CalculadoraRest.js`), tolerando quedas de conexão (`ECONNREFUSED`), timeouts e indisponibilidades temporárias (erros 5xx).
   - Parâmetros configuráveis: `maxRetries` (número de retentativas) e `retryDelayMs` ($T_s$, tempo de espera antes de tentar novamente).
   - Erros determinísticos de regra de negócio (como divisão por zero ou dados inválidos) não realizam retry inútil e são repassados imediatamente.

---

## 📁 Estrutura de Arquivos

```
04_calculadora_rest/
├── README.md                          # Este documento
├── package.json                       # Scripts auxiliares para execução
├── server/
│   ├── package.json                   # Dependências do servidor (express, cors)
│   ├── server.js                      # Servidor HTTP REST (comentado linha a linha)
│   ├── expressaoParser.js             # Parser seguro de expressões do servidor
│   └── public/                        # Interface Gráfica Web Visual
│       ├── index.html                 # Estrutura HTML da calculadora web
│       ├── style.css                  # Estilos em tema escuro / glassmorphism
│       └── app.js                     # Lógica do cliente web com Retry e decomposição
└── client/
    ├── package.json                   # Scripts do cliente
    ├── CalculadoraRest.js             # Classe de comunicação HTTP com Retry (comentada linha a linha)
    ├── expressaoDecompositor.js       # Decompositor de expressões para a Abordagem 1
    ├── client.js                      # Interface Gráfica Textual (CLI Interativa)
    └── test_retry.js                  # Script de teste automatizado e demonstração de Retry
```

---

## 🛠️ Como Executar

### 1. Iniciar o Servidor HTTP-REST

Certifique-se de que as dependências do servidor foram instaladas:
```bash
cd 04_calculadora_rest/server
npm install
npm start
```

O servidor iniciará em `http://localhost:3000`.

### 2. Acessar a Interface Gráfica Web (Visual)

Abra seu navegador em:
👉 **[http://localhost:3000](http://localhost:3000)**

Na interface web você poderá:
- Alternar entre **Expressão (Decomposta no Cliente)**, **Expressão (Cálculo no Servidor)** e **Operação  Individual**.
- Acompanhar no painel direito cada chamada HTTP em tempo real.
- Ativar o switch **"Simular Servidor Offline"** para visualizar a política de Retry em ação no navegador.

### 3. Executar a Interface Gráfica Textual (CLI)

Em outro terminal, com o servidor rodando:
```bash
cd 04_calculadora_rest/client
node client.js
```

Ou a partir da pasta raiz `04_calculadora_rest`:
```bash
npm run client
```

Menu interativo:
```
================================================================
      CALCULADORA DISTRIBUÍDA HTTP-REST (SISTEMAS DISTRIBUÍDOS) 
      Cliente em JavaScript com Suporte a Expressões e Retry    
================================================================

Conectado a: http://localhost:3000 | Ts: 2000ms, Max Retries: 3
Escolha uma operação:
  1 - Somar (+)
  2 - Subtrair (-)
  3 - Multiplicar (*)
  4 - Dividir (/)
  5 - Expressão matemática com parênteses [Abordagem 1: Decomposta no Cliente]
  6 - Expressão matemática com parênteses [Abordagem 2: Calculada no Servidor]
  7 - Testar / Demonstrar Política de RETRY (Wait Ts and Retry)
  8 - Configurar URL, Ts e Retentativas
  0 - Sair
```

### 4. Executar os Testes Automatizados da Política de Retry

Para demonstrar a tolerância a falhas e o cumprimento estrito do critério de avaliação da política de Retry:
```bash
cd 04_calculadora_rest/client
node test_retry.js
```

O script testará:
1. Uma conexão contra uma porta inativa, demonstrando as retentativas sequenciais com espera $T_s$ e timeout.
2. Todas as 4 operações básicas com o servidor online.
3. Expressões com parênteses em ambas as abordagens.
4. Rejeição imediata de divisão por zero sem desperdício de retentativas.

---

## 📡 Endpoints do Servidor HTTP REST

| Método | Endpoint | Descrição | Exemplo de Payload |
|---|---|---|---|
| `POST` | `/operacao` | Executa operação básica (+, -, *, /) conforme padrão dado pelo código já fornecido | `{"oper1": 10, "oper2": 15, "operacao": 1}` |
| `POST` | `/soma`, `/subtracao`, `/multiplicacao`, `/divisao` | Endpoints REST dedicados por operação | `{"a": 10, "b": 15}` ou `{"oper1": 10, "oper2": 15}` |
| `POST` | `/soma/:param1/:param2` | Rota compatível com o cliente Python do professor | Parâmetros na URL (ex: `/soma/10/5`) |
| `POST` | `/expressao` | Calcula a expressão inteira no servidor (Abordagem 2) | `{"expressao": "(10 + 15) * 4"}` |
| `GET`  | `/` | Interface Gráfica Web | Retorna página estática HTML |

---

## 🛡️ Detalhes da Política de Retry

A função `requisicaoComRetry` no cliente:
1. Cria um `AbortController` com tempo de timeout configurável (`timeoutMs = 5000ms`).
2. Se a chamada falhar por queda de rede (`ECONNREFUSED`), timeout ou resposta HTTP 5xx:
   - Identifica se o número de tentativas não ultrapassou `maxRetries`.
   - Se ainda houver tentativas, emite aviso no console, aguarda $T_s$ milissegundos (`retryDelayMs`) e repete a chamada.
   - Se todas as tentativas forem esgotadas, lança uma exceção com o histórico e motivo do erro.
3. Erros 4xx (como divisão por zero) lançam exceção imediatamente, sem retentativas.
