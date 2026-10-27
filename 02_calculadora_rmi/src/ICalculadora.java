import java.rmi.Remote;
import java.rmi.RemoteException;

/**
 * Interface remota da Calculadora (o "contrato" que cliente e servidor compartilham).
 * Todo metodo remoto precisa declarar RemoteException, pois a rede pode falhar.
 */
// "extends Remote" marca esta interface como acessivel remotamente via RMI
public interface ICalculadora extends Remote {

    // Soma remota: devolve a + b
    public double soma(double a, double b) throws RemoteException;

    // Subtracao remota: devolve a - b
    public double subtrai(double a, double b) throws RemoteException;

    // Multiplicacao remota: devolve a * b
    public double multiplica(double a, double b) throws RemoteException;

    // Divisao remota: devolve a / b (lanca ArithmeticException se b == 0)
    public double divide(double a, double b) throws RemoteException;

    // Abordagem 2: o servidor recebe a expressao inteira (ex: "(10 + 15) * 4") e calcula tudo
    public double avaliarExpressao(String expressao) throws RemoteException;
}
