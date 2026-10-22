import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.Socket;
import java.util.List;
import java.util.Scanner;
import java.util.Stack;

/**
 * Cliente Socket TCP para a Calculadora Distribuída.
 * Possui interface mínima textual e implementa:
 * - Operações básicas individuais (+, -, *, /)
 * - Expressões com parênteses decompostas no cliente (Abordagem 1)
 * - Expressões com parênteses calculadas no servidor (Abordagem 2)
 * Todas as linhas de comunicação de rede contêm comentários explicativos,
 * conforme exigido na especificação da atividade.
 */
public class CalculadoraClientSocket {

    // IP ou hostname do servidor da calculadora (127.0.0.1 para testes locais)
    private static final String HOST = "127.0.0.1";

    // Porta de comunicação onde o servidor está escutando
    private static final int PORTA = 9090;

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("=================================================");
        System.out.println("   Calculadora Distribuida - Cliente Socket TCP  ");
        System.out.println("=================================================");

        boolean executando = true;

        while (executando) {
            System.out.println("\nEscolha uma opcao:");
            System.out.println(" 1 - Operacao Basica Individual (+, -, *, /)");
            System.out.println(" 2 - Expressao Matematica (Abordagem 1: Decomposta no Cliente)");
            System.out.println(" 3 - Expressao Matematica (Abordagem 2: Calculada no Servidor)");
            System.out.println(" 0 - Sair");
            System.out.print("Opcao: ");

            String opcao = scanner.nextLine().trim();

            switch (opcao) {
                case "1":
                    executarOperacaoIndividual(scanner);
                    break;
                case "2":
                    executarExpressaoDecompostaCliente(scanner);
                    break;
                case "3":
                    executarExpressaoServidor(scanner);
                    break;
                case "0":
                    System.out.println("Encerrando cliente.");
                    executando = false;
                    break;
                default:
                    System.out.println("Opcao invalida. Tente novamente.");
            }
        }
        scanner.close();
    }

    /**
     * Envia uma operação básica ao servidor remoto através de um Socket TCP.
     * Cada linha de comunicação de rede está explicitamente comentada.
     */
    public static double chamarOperacaoRemota(int codigoOperacao, double a, double b) throws IOException {
        // Cria um socket cliente e inicia a tentativa de conexao TCP com o IP e Porta
        // do servidor
        Socket clientSocket = new Socket(HOST, PORTA);

        // Obtem o fluxo de saida de bytes associado ao socket para enviar dados para o
        // servidor
        java.io.OutputStream rawOutput = clientSocket.getOutputStream();

        // Envolve o fluxo de saida em um DataOutputStream para envio de strings e tipos
        // primitivos
        DataOutputStream socketSaidaServer = new DataOutputStream(rawOutput);

        // Envia o codigo da operacao (1=soma, 2=subtracao, 3=divisao, 4=multiplicacao)
        // com quebra de linha
        socketSaidaServer.writeBytes(codigoOperacao + "\n");

        // Envia o primeiro operando convertido em string seguido de quebra de linha
        socketSaidaServer.writeBytes(a + "\n");

        // Envia o segundo operando convertido em string seguido de quebra de linha
        socketSaidaServer.writeBytes(b + "\n");

        // Forca o envio imediato de todos os dados do buffer pela rede TCP
        socketSaidaServer.flush();

        // Obtem o fluxo de entrada de bytes associado ao socket para ler a resposta do
        // servidor
        java.io.InputStream rawInput = clientSocket.getInputStream();

        // Converte os bytes brutos lidos da rede para caracteres na codificacao UTF-8
        InputStreamReader reader = new InputStreamReader(rawInput, "UTF-8");

        // Envolve o leitor em um BufferedReader para possibilitar a leitura de linhas
        // completas
        BufferedReader messageFromServer = new BufferedReader(reader);

        // Aguarda e le a linha de texto enviada pelo servidor contendo o resultado da
        // conta
        String resultadoStr = messageFromServer.readLine();

        // Fecha o leitor de entrada do socket
        messageFromServer.close();

        // Fecha o fluxo de escrita do socket
        socketSaidaServer.close();

        // Encerra a conexao TCP com o servidor (envio de pacote TCP FIN)
        clientSocket.close();

        return Double.parseDouble(resultadoStr.trim());
    }

    /**
     * Envia uma expressão inteira para o servidor calcular remotamente (Abordagem
     * 2).
     * Cada linha de comunicação de rede está explicitamente comentada.
     */
    public static double chamarExpressaoRemotaNoServidor(String expressao) throws IOException {
        // Inicia a conexao TCP conectando na porta do servidor da calculadora
        Socket clientSocket = new Socket(HOST, PORTA);

        // Abre o fluxo de saida de dados do socket conectado
        DataOutputStream socketSaidaServer = new DataOutputStream(clientSocket.getOutputStream());

        // Envia o codigo especial de operacao 5 (indicando avaliacao de expressao no
        // servidor)
        socketSaidaServer.writeBytes("5\n");

        // Envia a string textual da expressao matematica (ex: (10 + 15) * 4) com quebra
        // de linha
        socketSaidaServer.writeBytes(expressao + "\n");

        // Forca o envio de todos os dados do buffer atraves da conexao TCP
        socketSaidaServer.flush();

        // Abre o buffer de leitura para receber a resposta do servidor atraves da rede
        BufferedReader messageFromServer = new BufferedReader(
                new InputStreamReader(clientSocket.getInputStream(), "UTF-8"));

        // Le a resposta do servidor contendo o valor final calculado da expressao
        String resultadoStr = messageFromServer.readLine();

        // Fecha os recursos de fluxo e a conexao TCP com o servidor
        messageFromServer.close();
        socketSaidaServer.close();
        clientSocket.close();

        return Double.parseDouble(resultadoStr.trim());
    }

    private static void executarOperacaoIndividual(Scanner scanner) {
        try {
            System.out.println("\n--- Operacao Basica ---");
            System.out.println(" 1: Soma (+)");
            System.out.println(" 2: Subtracao (-)");
            System.out.println(" 3: Divisao (/)");
            System.out.println(" 4: Multiplicacao (*)");
            System.out.print("Escolha a operacao (1-4): ");
            int op = Integer.parseInt(scanner.nextLine().trim());

            System.out.print("Digite o primeiro numero: ");
            double a = Double.parseDouble(scanner.nextLine().trim());

            System.out.print("Digite o segundo numero: ");
            double b = Double.parseDouble(scanner.nextLine().trim());

            System.out.println("Enviando requisicao socket para o servidor...");
            double res = chamarOperacaoRemota(op, a, b);
            System.out.println(">>> Resultado retornado pelo Servidor: " + res);

        } catch (Exception e) {
            System.err.println("Erro na operacao individual: " + e.getMessage());
        }
    }

    /**
     * Abordagem 1: O cliente quebra a expressão em Notação Polonesa Reversa (RPN)
     * e, para CADA operador (+, -, *, /), faz uma chamada remota de socket
     * individual ao servidor.
     */
    private static void executarExpressaoDecompostaCliente(Scanner scanner) {
        try {
            System.out.print("\nDigite a expressao matematica (ex: (10 + 15) * 4): ");
            String expr = scanner.nextLine().trim();

            System.out.println("Analisando e decompondo expressao no cliente...");
            List<String> tokens = Calculadora.tokenizar(expr);
            List<String> rpn = Calculadora.converterParaRPN(tokens);

            System.out.println("Sequencia de operacoes identificadas (RPN): " + rpn);

            Stack<Double> pilha = new Stack<>();
            int passo = 1;

            for (String token : rpn) {
                if (Calculadora.isNumero(token)) {
                    pilha.push(Double.parseDouble(token));
                } else {
                    double b = pilha.pop();
                    double a = pilha.pop();
                    int opCodigo = 1;
                    switch (token) {
                        case "+":
                            opCodigo = 1;
                            break;
                        case "-":
                            opCodigo = 2;
                            break;
                        case "/":
                            opCodigo = 3;
                            break;
                        case "*":
                            opCodigo = 4;
                            break;
                    }

                    System.out
                            .println("  [Passo " + passo++ + "] Chamando servidor para: " + a + " " + token + " " + b);
                    double parcial = chamarOperacaoRemota(opCodigo, a, b);
                    System.out.println("       -> Servidor retornou: " + parcial);
                    pilha.push(parcial);
                }
            }

            double resultadoFinal = pilha.pop();
            System.out.println("\n>>> Resultado Final (Abordagem 1 - Decomposta no Cliente): " + resultadoFinal);

        } catch (Exception e) {
            System.err.println("Erro ao avaliar expressao decomposta: " + e.getMessage());
        }
    }

    /**
     * Abordagem 2: O cliente envia a expressão inteira e o servidor calcula tudo
     * remotamente.
     */
    private static void executarExpressaoServidor(Scanner scanner) {
        try {
            System.out.print("\nDigite a expressao matematica (ex: (10 + 15) * 4): ");
            String expr = scanner.nextLine().trim();

            System.out.println("Enviando expressao inteira para o servidor via Socket...");
            double resultado = chamarExpressaoRemotaNoServidor(expr);
            System.out.println(">>> Resultado Final retornado pelo Servidor (Abordagem 2): " + resultado);

        } catch (Exception e) {
            System.err.println("Erro ao chamar servidor para expressao: " + e.getMessage());
        }
    }
}
