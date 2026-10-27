import java.rmi.registry.LocateRegistry;
import java.rmi.registry.Registry;
import java.rmi.server.UnicastRemoteObject;

/**
 * Servidor RMI: cria o objeto remoto, exporta-o na rede e o registra no rmiregistry.
 */
public class CalculadoraServidor {

    // Porta do rmiregistry (a "lista telefonica" onde o cliente procura o objeto pelo nome)
    private static final int PORTA_REGISTRY = 1099;

    // Porta fixa do objeto remoto (fixa para ser facil de filtrar no Wireshark)
    private static final int PORTA_OBJETO = 1100;

    // Nome sob o qual o objeto sera publicado no registry
    private static final String NOME = "calculadora";

    public static void main(String[] args) {
        try {
            // Informa aos clientes que este servidor deve ser contatado em 127.0.0.1 (teste local)
            System.setProperty("java.rmi.server.hostname", "127.0.0.1");

            // Cria a instancia real do objeto remoto (a calculadora do servidor)
            CalculadoraRemota objeto = new CalculadoraRemota();

            // Exporta o objeto: abre a porta 1100 para receber chamadas e devolve o stub (representante)
            ICalculadora stub = (ICalculadora) UnicastRemoteObject.exportObject(objeto, PORTA_OBJETO);

            // Cria o rmiregistry dentro deste proprio processo, escutando na porta 1099
            Registry registry = LocateRegistry.createRegistry(PORTA_REGISTRY);

            // Publica o stub no registry com o nome "calculadora" (rebind sobrescreve se ja existir)
            registry.rebind(NOME, stub);

            System.out.println("=================================================");
            System.out.println(" Servidor Calculadora RMI pronto");
            System.out.println(" Registry na porta " + PORTA_REGISTRY + " | Objeto na porta " + PORTA_OBJETO);
            System.out.println(" Aguardando chamadas remotas...");
            System.out.println("=================================================");
            // O processo continua vivo porque o RMI mantem threads escutando as portas
        } catch (Exception e) {
            // Qualquer falha (ex: porta ocupada) e mostrada e o servidor encerra
            System.err.println("Erro ao iniciar servidor RMI: " + e);
        }
    }
}
