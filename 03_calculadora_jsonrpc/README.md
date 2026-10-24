# Calculadora Distribuída — JSON-RPC

## Objetivo

Implementar uma calculadora distribuída com cliente e servidor independentes, usando JSON-RPC 2.0 sobre HTTP.

## Funcionalidades

- Soma, subtração, multiplicação e divisão.
- Cálculo de expressões matemáticas com parênteses.
- Expressão decomposta no cliente, com chamadas remotas para operações básicas.
- Expressão completa enviada ao servidor para cálculo.
- Tratamento de divisão por zero, métodos desconhecidos e parâmetros inválidos.
- Interface textual no cliente.
- Testes automatizados.

## Requisitos

- Python 3.10 ou superior.

## Como executar

Abra dois terminais na pasta `03_calculadora_jsonrpc`.

No primeiro terminal, inicie o servidor:

```bash
python server.py
```

No segundo terminal, inicie o cliente:

```bash
python client.py
```

O servidor utiliza o endereço local `127.0.0.1` e a porta `8000`.

## Executar os testes

```bash
python -m unittest -v test_calculadora.py
```

## Exemplo JSON-RPC

Requisição:

```json
{
  "jsonrpc": "2.0",
  "method": "multiplicar",
  "params": [10, 5],
  "id": 1
}
```

Resposta:

```json
{
  "jsonrpc": "2.0",
  "result": 50,
  "error": null,
  "id": 1
}
```

## Observação sobre as expressões

Na opção de cálculo no cliente, a expressão é interpretada localmente e cada operação básica é enviada ao servidor.

Na opção de cálculo no servidor, a expressão inteira é enviada em uma única chamada JSON-RPC.

## Limitações

A implementação destina-se a fins didáticos e utiliza HTTP sem criptografia, adequado para testes locais. Não deve ser exposta diretamente à internet sem medidas adicionais de segurança.
