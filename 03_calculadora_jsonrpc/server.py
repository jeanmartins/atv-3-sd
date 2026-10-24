from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import ast
import operator

OPERADORES = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}


def avaliar_expressao(expressao):
    arvore = ast.parse(expressao, mode="eval")

    def avaliar(no):
        if isinstance(no, ast.Constant) and type(no.value) in (int, float):
            return no.value

        if isinstance(no, ast.Expression):
            return avaliar(no.body)

        if isinstance(no, ast.BinOp) and type(no.op) in OPERADORES:
            a = avaliar(no.left)
            b = avaliar(no.right)

            if isinstance(no.op, ast.Div) and b == 0:
                raise ValueError("Divisão por zero.")

            return OPERADORES[type(no.op)](a, b)

        if isinstance(no, ast.UnaryOp) and isinstance(no.op, (ast.USub, ast.UAdd)):
            valor = avaliar(no.operand)
            return -valor if isinstance(no.op, ast.USub) else valor

        raise ValueError("Expressão inválida ou operação não permitida.")

    resultado = avaliar(arvore)
    return resultado


def executar_metodo(metodo, parametros):
    if not isinstance(parametros, list):
        raise ValueError("Os parâmetros devem ser uma lista.")

    if metodo in ("somar", "subtrair", "multiplicar", "dividir"):
        if len(parametros) != 2:
            raise ValueError("Informe exatamente dois números.")

        if any(type(n) not in (int, float) for n in parametros):
            raise ValueError("Os parâmetros devem ser números.")

        a, b = parametros

        if metodo == "somar":
            return a + b

        if metodo == "subtrair":
            return a - b

        if metodo == "multiplicar":
            return a * b

        if metodo == "dividir":
            if b == 0:
                raise ValueError("Divisão por zero.")

            return a / b

    if metodo == "calcular_expressao":
        if len(parametros) != 1 or not isinstance(parametros[0], str):
            raise ValueError("Informe uma expressão textual.")

        return avaliar_expressao(parametros[0])

    raise LookupError("Método desconhecido: " + str(metodo))


class CalculadoraHandler(BaseHTTPRequestHandler):

    def do_POST(self):
        tamanho = int(self.headers.get("Content-Length", "0"))
        corpo = self.rfile.read(tamanho)
        identificador = None

        try:
            requisicao = json.loads(corpo.decode("utf-8"))

            if not isinstance(requisicao, dict):
                raise ValueError("A requisição deve ser um objeto JSON.")

            identificador = requisicao.get("id")

            if requisicao.get("jsonrpc") != "2.0":
                raise ValueError("A versão deve ser JSON-RPC 2.0.")

            if not isinstance(requisicao.get("method"), str):
                raise ValueError("O método deve ser uma string.")

            parametros = requisicao.get("params", [])
            resultado = executar_metodo(requisicao["method"], parametros)

            resposta = {
                "jsonrpc": "2.0",
                "result": resultado,
                "id": identificador,
            }

        except json.JSONDecodeError:
            resposta = {
                "jsonrpc": "2.0",
                "error": {"code": -32700, "message": "JSON inválido."},
                "id": None,
            }

        except LookupError as erro:
            resposta = {
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": str(erro)},
                "id": identificador,
            }

        except (ValueError, TypeError, SyntaxError, ZeroDivisionError) as erro:
            resposta = {
                "jsonrpc": "2.0",
                "error": {"code": -32602, "message": str(erro)},
                "id": identificador,
            }

        except Exception:
            resposta = {
                "jsonrpc": "2.0",
                "error": {"code": -32603, "message": "Erro interno do servidor."},
                "id": identificador,
            }

        dados = json.dumps(resposta).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()

        self.wfile.write(dados)

    def log_message(self, formato, *argumentos):
        pass


if __name__ == "__main__":
    servidor = HTTPServer(("127.0.0.1", 8000), CalculadoraHandler)

    print("Servidor JSON-RPC disponível em http://127.0.0.1:8000")

    try:
        servidor.serve_forever()

    except KeyboardInterrupt:
        print("\nEncerrando o servidor.")

    finally:
        servidor.server_close()