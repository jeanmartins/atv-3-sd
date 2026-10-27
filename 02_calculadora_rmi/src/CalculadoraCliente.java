import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.util.List;
import java.util.Scanner;
import java.util.Stack;

/**
 * Cliente RMI com interface textual. Suporta:
 * - Operacoes individuais (+, -, *, /)
 * - Abordagem 1: expressao decomposta no cliente (uma chamada remota por operador)
 * - Abordagem 2: expressao inteira enviada ao servidor (uma unica chamada remota)
 */
public class CalculadoraCliente {

    // Endereco da maquina onde roda o rmiregistry/servidor
    private static final String HOST = "127.0.0.1";

    // Porta do rmiregistry no servidor
    private static final int PORTA_REGISTRY = 1099;

    // Referencia remota (stub) usada para invocar metodos no servidor como se fossem locais
    private static ICalculadora calc;

    public static void main(String[] args) {
        try {
            // Localiza o rmiregistry do servidor (ainda nao abre conexao de dados pesada)
            Registry registry = LocateRegistry.getRegistry(HOST, PORTA_REGISTRY);

            // Pergunta ao registry pelo nome "calculadora" e recebe o stub do objeto remoto
            calc = (ICalculadora) registry.lookup("calculadora");
        } catch (Exception e) {
            // Servidor desligado ou nome nao registrado
            System.err.println("Nao foi possivel conectar ao servidor RMI: " + e);
            return;
        }

        Scanner scanner = new Scanner(System.in);
        System.out.println("=================================================");
        System.out.println("   Calculadora Distribuida - Cliente Java RMI    ");
        System.out.println("=================================================");

        boolean executando = true;
        while (executando) {
            System.out.println("\nEscolha uma opcao:");
            System.out.println(" 1 - Operacao Basica Individual (+, -, *, /)");
            System.out.println(" 2 - Expressao (Abordagem 1: Decomposta no Cliente)");
            System.out.println(" 3 - Expressao (Abordagem 2: Calculada no Servidor)");
            System.out.println(" 0 - Sair");
            System.out.print("Opcao: ");
            String opcao = scanner.nextLine().trim();

            switch (opcao) {
                case "1": operacaoIndividual(scanner); break;
                case "2": expressaoNoCliente(scanner); break;
                case "3": expressaoNoServidor(scanner); break;
                case "0": executando = false; break;
                default: System.out.println("Opcao invalida.");
            }
        }
        scanner.close();
    }

    /** Invoca remotamente a operacao basica correspondente ao simbolo (+, -, *, /). */
    private static double chamarOperacao(String simbolo, double a, double b) throws Exception {
        switch (simbolo) {
            // Invocacao remota de soma: o stub serializa a e b, envia ao servidor e espera o resultado
            case "+": return calc.soma(a, b);
            // Invocacao remota de subtracao (mesmo mecanismo: serializa, envia, aguarda resposta)
            case "-": return calc.subtrai(a, b);
            // Invocacao remota de multiplicacao
            case "*": return calc.multiplica(a, b);
            // Invocacao remota de divisao (se b == 0, a excecao do servidor chega aqui)
            case "/": return calc.divide(a, b);
            default: throw new IllegalArgumentException("Operador invalido: " + simbolo);
        }
    }

    private static void operacaoIndividual(Scanner scanner) {
        try {
            System.out.print("Primeiro numero: ");
            double a = Double.parseDouble(scanner.nextLine().trim());
            System.out.print("Operador (+, -, *, /): ");
            String op = scanner.nextLine().trim();
            System.out.print("Segundo numero: ");
            double b = Double.parseDouble(scanner.nextLine().trim());
            System.out.println(">>> Resultado retornado pelo Servidor: " + chamarOperacao(op, a, b));
        } catch (Exception e) {
            System.err.println("Erro: " + e.getMessage());
        }
    }

    /** Abordagem 1: o cliente converte para RPN e faz UMA chamada RMI por operador. */
    private static void expressaoNoCliente(Scanner scanner) {
        try {
            System.out.print("Expressao (ex: (10 + 15) * 4): ");
            String expr = scanner.nextLine().trim();
            // Toda a analise da expressao acontece localmente, no cliente
            List<String> rpn = Calculadora.converterParaRPN(Calculadora.tokenizar(expr));
            System.out.println("Sequencia (RPN): " + rpn);

            Stack<Double> pilha = new Stack<>();
            int passo = 1;
            for (String token : rpn) {
                if (Calculadora.isNumero(token)) {
                    pilha.push(Double.parseDouble(token));
                } else {
                    double b = pilha.pop();
                    double a = pilha.pop();
                    System.out.println("  [Passo " + passo++ + "] Chamada RMI: " + a + " " + token + " " + b);
                    // Cada operador vira uma invocacao remota separada
                    double parcial = chamarOperacao(token, a, b);
                    System.out.println("       -> Servidor retornou: " + parcial);
                    pilha.push(parcial);
                }
            }
            System.out.println(">>> Resultado Final (Abordagem 1): " + pilha.pop());
        } catch (Exception e) {
            System.err.println("Erro: " + e.getMessage());
        }
    }

    /** Abordagem 2: uma unica chamada RMI com a expressao inteira como String. */
    private static void expressaoNoServidor(Scanner scanner) {
        try {
            System.out.print("Expressao (ex: (10 + 15) * 4): ");
            String expr = scanner.nextLine().trim();
            // Uma unica invocacao remota: o servidor tokeniza, converte e calcula
            double resultado = calc.avaliarExpressao(expr);
            System.out.println(">>> Resultado Final (Abordagem 2): " + resultado);
        } catch (Exception e) {
            System.err.println("Erro: " + e.getMessage());
        }
    }
}
