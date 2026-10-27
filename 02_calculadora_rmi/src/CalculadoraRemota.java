import java.rmi.RemoteException;

/**
 * Objeto remoto: a implementacao real da calculadora, que vive no servidor.
 * O cliente nunca recebe este objeto; recebe apenas um "stub" (representante) dele.
 */
// Implementa o contrato remoto; a logica matematica fica na classe Calculadora (local)
public class CalculadoraRemota implements ICalculadora {

    // Objeto com a matematica pura (operacoes e avaliador de expressoes)
    private final Calculadora calc = new Calculadora();

    // Contador de chamadas recebidas, apenas para exibir no console do servidor
    private int chamadas = 0;

    @Override
    public double soma(double a, double b) throws RemoteException {
        // Registra no console do servidor que a invocacao remota chegou
        System.out.println("[Chamada " + (++chamadas) + "] soma(" + a + ", " + b + ")");
        // Delega o calculo e devolve o resultado (RMI serializa o double e envia ao cliente)
        return calc.soma(a, b);
    }

    @Override
    public double subtrai(double a, double b) throws RemoteException {
        // Registra a invocacao remota no console do servidor
        System.out.println("[Chamada " + (++chamadas) + "] subtrai(" + a + ", " + b + ")");
        // Calcula e devolve ao cliente
        return calc.subtrai(a, b);
    }

    @Override
    public double multiplica(double a, double b) throws RemoteException {
        // Registra a invocacao remota no console do servidor
        System.out.println("[Chamada " + (++chamadas) + "] multiplica(" + a + ", " + b + ")");
        // Calcula e devolve ao cliente
        return calc.multiplica(a, b);
    }

    @Override
    public double divide(double a, double b) throws RemoteException {
        // Registra a invocacao remota no console do servidor
        System.out.println("[Chamada " + (++chamadas) + "] divide(" + a + ", " + b + ")");
        // Calcula e devolve; se b == 0 a excecao e serializada e relancada no cliente
        return calc.divide(a, b);
    }

    @Override
    public double avaliarExpressao(String expressao) throws RemoteException {
        // Registra a expressao completa recebida do cliente (Abordagem 2)
        System.out.println("[Chamada " + (++chamadas) + "] avaliarExpressao(\"" + expressao + "\")");
        // O servidor faz todo o trabalho (tokeniza, converte para RPN e calcula)
        return calc.avaliarExpressao(expressao);
    }
}
