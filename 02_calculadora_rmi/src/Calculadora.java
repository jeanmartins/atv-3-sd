import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

/**
 * Classe responsável pelas operações matemáticas da Calculadora.
 * Contém operações básicas e lógica de resolução de expressões com parênteses.
 */
public class Calculadora {

    public double soma(double a, double b) {
        return a + b;
    }

    public double subtrai(double a, double b) {
        return a - b;
    }

    public double multiplica(double a, double b) {
        return a * b;
    }

    public double divide(double a, double b) {
        if (b == 0) {
            throw new ArithmeticException("Erro: Divisão por zero não é permitida.");
        }
        return a / b;
    }

    /**
     * Avalia uma expressão matemática com suporte a +, -, *, / e parênteses.
     * Utiliza o algoritmo Shunting-Yard para converter em Notação Polonesa Reversa
     * (RPN)
     * e em seguida calcular o resultado.
     */
    public double avaliarExpressao(String expressao) {
        List<String> tokens = tokenizar(expressao);
        List<String> rpn = converterParaRPN(tokens);
        return avaliarRPN(rpn);
    }

    /**
     * Quebra a string da expressão em números, operadores e parênteses.
     */
    public static List<String> tokenizar(String expr) {
        List<String> tokens = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < expr.length(); i++) {
            char c = expr.charAt(i);
            if (Character.isWhitespace(c)) {
                continue;
            }
            if (Character.isDigit(c) || c == '.') {
                sb.append(c);
            } else if (c == '+' || c == '-' || c == '*' || c == '/' || c == '(' || c == ')') {
                if (sb.length() > 0) {
                    tokens.add(sb.toString());
                    sb.setLength(0);
                }
                tokens.add(String.valueOf(c));
            } else {
                throw new IllegalArgumentException("Caractere inválido na expressão: " + c);
            }
        }
        if (sb.length() > 0) {
            tokens.add(sb.toString());
        }
        return tokens;
    }

    private static int precedencia(String op) {
        if (op.equals("+") || op.equals("-"))
            return 1;
        if (op.equals("*") || op.equals("/"))
            return 2;
        return 0;
    }

    /**
     * Converte lista de tokens infixa para posfixa (RPN) usando Shunting-Yard.
     */
    public static List<String> converterParaRPN(List<String> tokens) {
        List<String> output = new ArrayList<>();
        Stack<String> operadores = new Stack<>();

        for (String token : tokens) {
            if (isNumero(token)) {
                output.add(token);
            } else if (token.equals("(")) {
                operadores.push(token);
            } else if (token.equals(")")) {
                while (!operadores.isEmpty() && !operadores.peek().equals("(")) {
                    output.add(operadores.pop());
                }
                if (!operadores.isEmpty() && operadores.peek().equals("(")) {
                    operadores.pop(); // Descarta o "("
                }
            } else { // Operador +, -, *, /
                while (!operadores.isEmpty() && precedencia(operadores.peek()) >= precedencia(token)) {
                    output.add(operadores.pop());
                }
                operadores.push(token);
            }
        }
        while (!operadores.isEmpty()) {
            output.add(operadores.pop());
        }
        return output;
    }

    /**
     * Calcula o valor de uma lista em RPN localmente.
     */
    private double avaliarRPN(List<String> rpn) {
        Stack<Double> pilha = new Stack<>();
        for (String token : rpn) {
            if (isNumero(token)) {
                pilha.push(Double.parseDouble(token));
            } else {
                if (pilha.size() < 2)
                    throw new IllegalArgumentException("Expressão mal formada.");
                double b = pilha.pop();
                double a = pilha.pop();
                double res = 0;
                switch (token) {
                    case "+":
                        res = soma(a, b);
                        break;
                    case "-":
                        res = subtrai(a, b);
                        break;
                    case "*":
                        res = multiplica(a, b);
                        break;
                    case "/":
                        res = divide(a, b);
                        break;
                }
                pilha.push(res);
            }
        }
        return pilha.pop();
    }

    public static boolean isNumero(String s) {
        try {
            Double.parseDouble(s);
            return true;
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
