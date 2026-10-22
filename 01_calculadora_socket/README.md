# 🧮 Módulo 1: Calculadora Distribuída via Socket TCP

Este projeto implementa a comunicação direta cliente-servidor usando **Sockets TCP** puros em Java, atendendo a todos os requisitos da **Atividade AT03**.

---

## 💡 O que é um Socket neste contexto?
Um **Socket** é o mecanismo fundamental de baixo nível que o Sistema Operacional fornece para dois programas conversarem através da rede (TCP/IP).
* O **Servidor** cria um `ServerSocket(9090)`, que fica "ouvindo" a porta 9090 da máquina como uma linha telefônica aberta aguardando chamadas.
* O **Cliente** cria um `Socket("127.0.0.1", 9090)`, "discando" para o servidor.
* Uma vez aceita a conexão (`welcomeSocket.accept()`), cria-se um **túnel bidirecional de bytes**:
  * O cliente escreve bytes no `OutputStream` (envia operação e números).
  * O servidor lê os bytes no `InputStream`, faz o cálculo e responde pelo seu `OutputStream`.
  * Não há nenhuma camada mágica intermediária: os dados trafegam como texto bruto pela rede.

---

## ⚙️ Funcionalidades Implementadas

1. **Operações Básicas:** Soma (`+`), Subtração (`-`), Divisão (`/`) e Multiplicação (`*`).
2. **Abordagem 1 (Decomposta no Cliente):**
   * O cliente decompõe a expressão matemática (ex: `(10 + 15) * 4`) em notação pós-fixa (RPN).
   * Para cada operação intermediária, o cliente faz uma chamada de socket remota separada ao servidor.
3. **Abordagem 2 (Calculada no Servidor):**
   * O cliente envia a string da expressão inteira via socket.
   * O servidor processa e avalia a expressão remotamente, devolvendo o resultado pronto.
4. **Comentários Linha a Linha:** Todas as instruções que manipulam `Socket`, `ServerSocket`, `InputStream`, `OutputStream`, `flush()` e `close()` contêm comentários explicativos, atendendo à exigência do professor.

---

## 🚀 Como Executar

### 1. Compilação
Abra o terminal na pasta `01_calculadora_socket/src` e execute:
```bash
javac Calculadora.java CalculadoraServerSocket.java CalculadoraClientSocket.java
```

### 2. Iniciar o Servidor
Em um terminal, execute:
```bash
java CalculadoraServerSocket
```
Você verá a mensagem:
```text
=================================================
 Servidor Calculadora Socket iniciado na porta 9090
 Aguardando conexoes de clientes...
=================================================
```

### 3. Iniciar o Cliente (Interface Gráfica ou Terminal)

#### Opção A: Interface Gráfica Moderna (Recomendada 🖥️)
Para uma experiência visual completa com botões, visor e **monitor de rede TCP em tempo real**:
```bash
java CalculadoraGUI
```
* Permite alternar facilmente entre a **Abordagem 1** e a **Abordagem 2**.
* Possui teclado virtual com botões clicáveis e suporte a digitação física (Enter para calcular, Esc para limpar).
* Exibe no painel lateral o log detalhado de cada pacote socket trafegado e o tempo de resposta (RTT) em milissegundos.

#### Opção B: Cliente em Linha de Comando (CLI)
Se preferir utilizar via terminal texto:
```bash
java CalculadoraClientSocket
```
