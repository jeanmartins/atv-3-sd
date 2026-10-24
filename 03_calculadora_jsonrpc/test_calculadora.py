import unittest

from server import executar_metodo, avaliar_expressao


class TestCalculadora(unittest.TestCase):

    def test_soma(self):
        self.assertEqual(executar_metodo("somar", [10, 5]), 15)

    def test_subtracao(self):
        self.assertEqual(executar_metodo("subtrair", [10, 5]), 5)

    def test_multiplicacao(self):
        self.assertEqual(executar_metodo("multiplicar", [10, 5]), 50)

    def test_divisao(self):
        self.assertEqual(executar_metodo("dividir", [10, 5]), 2)

    def test_divisao_por_zero(self):
        with self.assertRaises(ValueError):
            executar_metodo("dividir", [10, 0])

    def test_precedencia(self):
        self.assertEqual(avaliar_expressao("10 + 5 * 4"), 30)

    def test_parenteses(self):
        self.assertEqual(avaliar_expressao("(10 + 5) * 4"), 60)

    def test_expressao_complexa(self):
        self.assertEqual(avaliar_expressao("(20 - 5) / 3 + 2"), 7)

    def test_metodo_expressao(self):
        resultado = executar_metodo("calcular_expressao", ["(10 + 5) * 4"])
        self.assertEqual(resultado, 60)

    def test_expressao_insegura(self):
        with self.assertRaises(ValueError):
            avaliar_expressao("__import__('os').system('dir')")

    def test_metodo_desconhecido(self):
        with self.assertRaises(LookupError):
            executar_metodo("potencia", [2, 3])


if __name__ == "__main__":
    unittest.main()