import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * Servidor Socket TCP para a Calculadora Distribuída.
 * Todas as linhas de comunicação de rede contêm comentários explicativos,
 * conforme exigido na especificação da atividade.
 */
public class CalculadoraServerSocket {

    // Porta TCP onde o servidor aguardará conexões de clientes
    private static final int PORTA = 9090;

    public static void main(String[] args) {
        // Instancia a lógica de cálculo matemática da calculadora
        Calculadora calc = new Calculadora();

        // Declaração do socket de boas-vindas do servidor
        ServerSocket welcomeSocket = null;

        try {
            // Cria o ServerSocket associado à porta 9090 no SO (bind) e inicia a escuta
            // (listen)
            welcomeSocket = new ServerSocket(PORTA);
            System.out.println("=================================================");
            System.out.println(" Servidor Calculadora Socket iniciado na porta " + PORTA);
            System.out.println(" Aguardando conexoes de clientes...");
            System.out.println("=================================================");

            int conexoesCount = 0;

            // Loop principal infinito para aceitar múltiplos clientes sequencialmente
            while (true) {
                // Bloqueia a execução até que um cliente solicite conexão (Three-Way Handshake
                // TCP)
                Socket connectionSocket = welcomeSocket.accept();
                conexoesCount++;

                // Exibe no console o endereço IP e a porta efêmera do cliente conectado
                System.out.println("\n[Conexao #" + conexoesCount + "] Cliente conectado: "
                        + connectionSocket.getInetAddress().getHostAddress() + ":" + connectionSocket.getPort());

                // Obtém o stream de entrada bruto do socket de conexão
                java.io.InputStream rawInput = connectionSocket.getInputStream();

                // Converte bytes brutos recebidos em caracteres usando codificação UTF-8
                InputStreamReader reader = new InputStreamReader(rawInput, "UTF-8");

                // Envolve o reader em um buffer de leitura para permitir ler linhas inteiras
                // (readLine)
                BufferedReader socketEntrada = new BufferedReader(reader);

                // Obtém o stream de saída bruto do socket de conexão para enviar dados ao
                // cliente
                java.io.OutputStream rawOutput = connectionSocket.getOutputStream();

                // Envolve o stream de saída em DataOutputStream para facilitar envio de strings
                // e bytes formatados
                DataOutputStream socketOutput = new DataOutputStream(rawOutput);

                // Lê a primeira linha enviada pelo cliente, que indica o código da operação
                // desejada
                String tipoOperacaoStr = socketEntrada.readLine();

                if (tipoOperacaoStr != null) {
                    int tipoOperacao = Integer.parseInt(tipoOperacaoStr.trim());
                    String respostaParaCliente = "";

                    // Casos 1 a 4: Operações básicas individuais (soma, subtração, divisão,
                    // multiplicação)
                    if (tipoOperacao >= 1 && tipoOperacao <= 4) {
                        // Lê a segunda linha: primeiro operando
                        String oper1Str = socketEntrada.readLine();
                        // Lê a terceira linha: segundo operando
                        String oper2Str = socketEntrada.readLine();

                        double a = Double.parseDouble(oper1Str.trim());
                        double b = Double.parseDouble(oper2Str.trim());
                        double resultado = 0;

                        switch (tipoOperacao) {
                            case 1:
                                resultado = calc.soma(a, b);
                                System.out.println("  Executando: " + a + " + " + b + " = " + resultado);
                                break;
                            case 2:
                                resultado = calc.subtrai(a, b);
                                System.out.println("  Executando: " + a + " - " + b + " = " + resultado);
                                break;
                            case 3:
                                resultado = calc.divide(a, b);
                                System.out.println("  Executando: " + a + " / " + b + " = " + resultado);
                                break;
                            case 4:
                                resultado = calc.multiplica(a, b);
                                System.out.println("  Executando: " + a + " * " + b + " = " + resultado);
                                break;
                        }
                        respostaParaCliente = String.valueOf(resultado);

                    } else if (tipoOperacao == 5) {
                        // Caso 5: Abordagem 2 (Expressão matemática calculada inteiramente no servidor)
                        String expressao = socketEntrada.readLine();
                        System.out.println("  Calculando expressao no servidor: " + expressao);
                        double resultado = calc.avaliarExpressao(expressao);
                        respostaParaCliente = String.valueOf(resultado);
                        System.out.println("  Resultado da expressao: " + resultado);
                    } else {
                        respostaParaCliente = "ERRO: Codigo de operacao desconhecido (" + tipoOperacao + ")";
                    }

                    // Escreve os bytes da resposta terminada com quebra de linha (\n) no buffer de
                    // saída do socket
                    socketOutput.writeBytes(respostaParaCliente + "\n");

                    // Força o envio imediato de quaisquer bytes pendentes no buffer de saída
                    // através da rede
                    socketOutput.flush();
                }

                // Fecha o leitor de entrada do socket
                socketEntrada.close();

                // Fecha o fluxo de escrita do socket
                socketOutput.close();

                // Fecha a conexão TCP com este cliente específico (envio de pacote FIN no TCP)
                connectionSocket.close();
                System.out.println("  Conexao finalizada com sucesso.");
            }

        } catch (IOException e) {
            System.err.println("Erro de E/S no servidor: " + e.getMessage());
            e.printStackTrace();
        } finally {
            if (welcomeSocket != null && !welcomeSocket.isClosed()) {
                try {
                    // Libera a porta e encerra o socket de escuta do servidor
                    welcomeSocket.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
