import urllib.request
import urllib.error
import json
import ast
import operator

URL_SERVIDOR = "http://127.0.0.1:8000"

proximo_id = 1

OPERADORES = {
    ast.Add: ("somar", operator.add),
    ast.Sub: ("subtrair", operator.sub),
    ast.Mult: ("multiplicar", operator.mul),
    ast.Div: ("dividir", operator.truediv),
}


def chamar_rpc(metodo, parametros):
    global proximo_id

    identificador = proximo_id
    proximo_id += 1

    requisicao = {
        "jsonrpc": "2.0",
        "method": metodo,
        "params": parametros,
        "id": identificador,
    }

    dados = json.dumps(requisicao).encode("utf-8")

    pedido = urllib.request.Request(
        URL_SERVIDOR,
        data=dados,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(pedido, timeout=5) as resposta_http:
        resposta = json.loads(resposta_http.read().decode("utf-8"))

    if resposta.get("id") != identificador:
        raise RuntimeError(
            "O identificador da resposta não corresponde à chamada."
        )

    if resposta.get("error") is not None:
        erro = resposta["error"]
        mensagem = erro["message"]

        if "zero" in mensagem.lower() and metodo in (
            "dividir",
            "calcular_expressao",
        ):
            raise ZeroDivisionError(mensagem)

        raise ValueError(
            f"Erro JSON-RPC {erro['code']}: {mensagem}"
        )

    return resposta["result"]


def calcular_no_cliente(expressao):
    arvore = ast.parse(expressao, mode="eval")

    def avaliar(no):
        if isinstance(no, ast.Constant) and type(no.value) in (int, float):
            return no.value

        if isinstance(no, ast.Expression):
            return avaliar(no.body)

        if isinstance(no, ast.BinOp) and type(no.op) in OPERADORES:
            a = avaliar(no.left)
            b = avaliar(no.right)

            metodo, _ = OPERADORES[type(no.op)]

            return chamar_rpc(metodo, [a, b])

        if isinstance(no, ast.UnaryOp) and isinstance(
            no.op, (ast.USub, ast.UAdd)
        ):
            valor = avaliar(no.operand)
            return -valor if isinstance(no.op, ast.USub) else valor

        raise ValueError(
            "Expressão inválida ou operação não permitida."
        )

    return avaliar(arvore)


def ler_dois_numeros():
    a = float(input("Primeiro número: ").replace(",", "."))
    b = float(input("Segundo número: ").replace(",", "."))
    return a, b


def main():
    print("=== Calculadora Distribuída JSON-RPC ===")

    while True:
        print("\n1 - Somar")
        print("2 - Subtrair")
        print("3 - Multiplicar")
        print("4 - Dividir")
        print("5 - Expressão calculada no cliente")
        print("6 - Expressão calculada no servidor")
        print("0 - Sair")

        opcao = input("Escolha: ").strip()

        if opcao == "0":
            print("Cliente encerrado.")
            break

        try:
            if opcao in ("1", "2", "3", "4"):
                a, b = ler_dois_numeros()

                metodos = {
                    "1": "somar",
                    "2": "subtrair",
                    "3": "multiplicar",
                    "4": "dividir",
                }

                resultado = chamar_rpc(metodos[opcao], [a, b])

            elif opcao == "5":
                expressao = input("Digite a expressão: ")
                resultado = calcular_no_cliente(expressao)

            elif opcao == "6":
                expressao = input("Digite a expressão: ")
                resultado = chamar_rpc(
                    "calcular_expressao", [expressao]
                )

            else:
                print("Opção inválida.")
                continue

            print("Resultado:", resultado)

        except ZeroDivisionError as erro:
            print("Erro: não é possível dividir por zero.")
            print("Detalhes:", erro)

        except (ValueError, SyntaxError) as erro:
            print("Erro:", erro)

        except (urllib.error.URLError, TimeoutError, OSError) as erro:
            print("Falha de comunicação com o servidor:", erro)

        except Exception as erro:
            print("Erro inesperado:", erro)


if __name__ == "__main__":
    main()