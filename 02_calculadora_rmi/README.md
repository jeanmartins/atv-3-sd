# Módulo 2: Calculadora Distribuída via Java RMI

Evolução do projeto `ExemploRMI` dos professores ([codigosSD](https://github.com/windcarvalho/codigosSD/tree/master/ExemploRMI)), que só tinha a soma. As linhas de comunicação RMI estão comentadas uma a uma, como pede o enunciado.

RMI (Remote Method Invocation) deixa o cliente chamar um método que roda em **outra JVM** como se fosse local:
`calc.soma(10, 5)`. O Java cuida de serializar os argumentos, enviar pela rede e devolver o resultado.

## Peças
| Arquivo | Papel |
|---|---|
| `ICalculadora.java` | Interface remota (contrato): soma, subtrai, multiplica, divide, avaliarExpressao |
| `CalculadoraRemota.java` | Objeto remoto (implementação que roda no servidor) |
| `CalculadoraServidor.java` | Exporta o objeto (porta 1100) e o registra no rmiregistry (porta 1099) |
| `CalculadoraCliente.java` | Cliente textual: operações, Abordagem 1 e Abordagem 2 |
| `Calculadora.java` | Matemática pura (tokenizador, Shunting-Yard/RPN) |

## Como executar
```bash
cd 02_calculadora_rmi/src
javac -encoding UTF-8 *.java
java CalculadoraServidor      # terminal 1
java CalculadoraCliente       # terminal 2
```

## As duas abordagens
* **Abordagem 1:** o cliente converte `(10 + 15) * 4` para RPN e faz **uma chamada RMI por operador** (`soma`, depois `multiplica`).
* **Abordagem 2:** o cliente chama `avaliarExpressao("(10 + 15) * 4")` — **uma única chamada**; o servidor calcula tudo.

Divisão por zero: a exceção é lançada no servidor e chega ao cliente (RMI serializa exceções).

Captura Wireshark: ver [`../docs/GUIA_WIRESHARK_MODULOS_1_E_2.md`](../docs/GUIA_WIRESHARK_MODULOS_1_E_2.md).
