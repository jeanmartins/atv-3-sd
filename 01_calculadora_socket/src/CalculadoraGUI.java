import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.io.IOException;
import java.util.List;
import java.util.Stack;

/**
 * Interface Gráfica Moderna (GUI) para a Calculadora Distribuída via Sockets TCP.
 * Atende aos requisitos da Atividade AT03 (Sistemas Distribuídos):
 *  - Suporte às 4 operações (+, -, *, /) e expressões complexas com parênteses.
 *  - Alternância interativa entre Abordagem 1 (Decomposta no Cliente) e Abordagem 2 (Calculada no Servidor).
 *  - Monitor de Rede em tempo real exibindo os pacotes e chamadas de Socket TCP.
 */
public class CalculadoraGUI extends JFrame {

    // Cores do tema moderno Dark (inspirado em Catppuccin / VS Code Modern)
    private static final Color BG_DARK = new Color(24, 24, 37);
    private static final Color BG_CARD = new Color(30, 30, 46);
    private static final Color BG_DISPLAY = new Color(17, 17, 27);
    private static final Color TEXT_PRIMARY = new Color(205, 214, 244);
    private static final Color TEXT_MUTED = new Color(147, 153, 178);
    private static final Color ACCENT_BLUE = new Color(137, 180, 250);
    private static final Color ACCENT_GREEN = new Color(166, 227, 161);
    private static final Color ACCENT_RED = new Color(243, 139, 168);
    private static final Color BTN_NUM_BG = new Color(49, 50, 68);
    private static final Color BTN_NUM_HOVER = new Color(69, 71, 90);
    private static final Color BTN_OP_BG = new Color(137, 180, 250);
    private static final Color BORDER_COLOR = new Color(69, 71, 90);

    private JTextField txtExpressao;
    private JLabel lblResultado;
    private JRadioButton radAbordagem1;
    private JRadioButton radAbordagem2;
    private JTextArea txtLogRede;
    private JLabel lblStatusConexao;

    public CalculadoraGUI() {
        super("Calculadora Distribuída TCP - Sistemas Distribuídos");
        configurarJanela();
        inicializarComponentes();
        testarConexaoSilenciosa();
    }

    private void configurarJanela() {
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(920, 620);
        setMinimumSize(new Dimension(860, 580));
        setLocationRelativeTo(null);
        getContentPane().setBackground(BG_DARK);
        setLayout(new BorderLayout(16, 16));
    }

    private void inicializarComponentes() {
        // Painel Superior: Cabeçalho com Status da Conexão
        JPanel pnlTopo = criarPainelTopo();
        add(pnlTopo, BorderLayout.NORTH);

        // Painel Central: Dividido em Calculadora (Esquerda) e Inspetor de Rede Socket (Direita)
        JPanel pnlCorpo = new JPanel(new GridLayout(1, 2, 16, 0));
        pnlCorpo.setBackground(BG_DARK);
        pnlCorpo.setBorder(new EmptyBorder(0, 16, 16, 16));

        JPanel pnlCalculadora = criarPainelCalculadora();
        JPanel pnlInspetorRede = criarPainelInspetorRede();

        pnlCorpo.add(pnlCalculadora);
        pnlCorpo.add(pnlInspetorRede);

        add(pnlCorpo, BorderLayout.CENTER);
    }

    private JPanel criarPainelTopo() {
        JPanel pnl = new JPanel(new BorderLayout());
        pnl.setBackground(BG_CARD);
        pnl.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createMatteBorder(0, 0, 1, 0, BORDER_COLOR),
                new EmptyBorder(12, 20, 12, 20)
        ));

        JLabel lblTitulo = new JLabel("🧮 Calculadora Distribuída TCP");
        lblTitulo.setFont(new Font("Segoe UI", Font.BOLD, 18));
        lblTitulo.setForeground(TEXT_PRIMARY);

        JPanel pnlDireita = new JPanel(new FlowLayout(FlowLayout.RIGHT, 12, 0));
        pnlDireita.setOpaque(false);

        lblStatusConexao = new JLabel("● Verificando Servidor...");
        lblStatusConexao.setFont(new Font("Segoe UI", Font.BOLD, 13));
        lblStatusConexao.setForeground(TEXT_MUTED);

        JButton btnTestar = criarBotaoPequeno("🔄 Testar Socket", ACCENT_BLUE);
        btnTestar.addActionListener(e -> testarConexaoExplicita());

        pnlDireita.add(lblStatusConexao);
        pnlDireita.add(btnTestar);

        pnl.add(lblTitulo, BorderLayout.WEST);
        pnl.add(pnlDireita, BorderLayout.EAST);
        return pnl;
    }

    private JPanel criarPainelCalculadora() {
        JPanel pnl = new JPanel(new BorderLayout(0, 12));
        pnl.setBackground(BG_CARD);
        pnl.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(BORDER_COLOR, 1, true),
                new EmptyBorder(16, 16, 16, 16)
        ));

        // Seletor de Abordagem
        JPanel pnlModo = new JPanel(new GridLayout(2, 1, 4, 4));
        pnlModo.setBackground(BG_CARD);
        pnlModo.setBorder(new EmptyBorder(0, 0, 8, 0));

        radAbordagem1 = new JRadioButton("Abordagem 1: Decomposta no Cliente (RPN + Sockets)", true);
        radAbordagem2 = new JRadioButton("Abordagem 2: Calculada Remotamente no Servidor");

        ButtonGroup grupo = new ButtonGroup();
        grupo.add(radAbordagem1);
        grupo.add(radAbordagem2);

        estilizarRadioButton(radAbordagem1);
        estilizarRadioButton(radAbordagem2);

        pnlModo.add(radAbordagem1);
        pnlModo.add(radAbordagem2);

        // Visor da Calculadora
        JPanel pnlDisplay = new JPanel(new BorderLayout(0, 4));
        pnlDisplay.setBackground(BG_DISPLAY);
        pnlDisplay.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(BORDER_COLOR, 1, true),
                new EmptyBorder(10, 14, 10, 14)
        ));

        txtExpressao = new JTextField();
        txtExpressao.setFont(new Font("Consolas", Font.BOLD, 22));
        txtExpressao.setBackground(BG_DISPLAY);
        txtExpressao.setForeground(TEXT_PRIMARY);
        txtExpressao.setCaretColor(ACCENT_BLUE);
        txtExpressao.setBorder(null);
        txtExpressao.setHorizontalAlignment(JTextField.RIGHT);

        txtExpressao.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER) {
                    calcularExpressao();
                } else if (e.getKeyCode() == KeyEvent.VK_ESCAPE) {
                    limpar();
                }
            }
        });

        lblResultado = new JLabel("= 0");
        lblResultado.setFont(new Font("Segoe UI", Font.BOLD, 18));
        lblResultado.setForeground(ACCENT_GREEN);
        lblResultado.setHorizontalAlignment(JLabel.RIGHT);

        pnlDisplay.add(txtExpressao, BorderLayout.NORTH);
        pnlDisplay.add(lblResultado, BorderLayout.SOUTH);

        // Painel Superior de Controles (Modo + Display)
        JPanel pnlTopoCalc = new JPanel(new BorderLayout(0, 8));
        pnlTopoCalc.setOpaque(false);
        pnlTopoCalc.add(pnlModo, BorderLayout.NORTH);
        pnlTopoCalc.add(pnlDisplay, BorderLayout.CENTER);

        // Teclado da Calculadora
        JPanel pnlBotoes = new JPanel(new GridLayout(5, 4, 8, 8));
        pnlBotoes.setBackground(BG_CARD);

        String[] botoes = {
                "C", "(", ")", "/",
                "7", "8", "9", "*",
                "4", "5", "6", "-",
                "1", "2", "3", "+",
                "⌫", "0", ".", "="
        };

        for (String texto : botoes) {
            JButton btn = criarBotaoTeclado(texto);
            pnlBotoes.add(btn);
        }

        pnl.add(pnlTopoCalc, BorderLayout.NORTH);
        pnl.add(pnlBotoes, BorderLayout.CENTER);

        return pnl;
    }

    private JPanel criarPainelInspetorRede() {
        JPanel pnl = new JPanel(new BorderLayout(0, 10));
        pnl.setBackground(BG_CARD);
        pnl.setBorder(BorderFactory.createCompoundBorder(
                new LineBorder(BORDER_COLOR, 1, true),
                new EmptyBorder(16, 16, 16, 16)
        ));

        JPanel pnlTitulo = new JPanel(new BorderLayout());
        pnlTitulo.setOpaque(false);

        JLabel lbl = new JLabel("🌐 Monitor de Rede TCP (Socket 9090)");
        lbl.setFont(new Font("Segoe UI", Font.BOLD, 14));
        lbl.setForeground(TEXT_PRIMARY);

        JButton btnLimparLog = criarBotaoPequeno("Limpar", TEXT_MUTED);
        btnLimparLog.addActionListener(e -> txtLogRede.setText(""));

        pnlTitulo.add(lbl, BorderLayout.WEST);
        pnlTitulo.add(btnLimparLog, BorderLayout.EAST);

        txtLogRede = new JTextArea();
        txtLogRede.setFont(new Font("Consolas", Font.PLAIN, 12));
        txtLogRede.setBackground(BG_DISPLAY);
        txtLogRede.setForeground(new Color(166, 227, 161));
        txtLogRede.setCaretColor(Color.WHITE);
        txtLogRede.setEditable(false);
        txtLogRede.setMargin(new Insets(10, 10, 10, 10));
        txtLogRede.setLineWrap(true);
        txtLogRede.setWrapStyleWord(true);

        JScrollPane scroll = new JScrollPane(txtLogRede);
        scroll.setBorder(new LineBorder(BORDER_COLOR, 1, true));
        scroll.getViewport().setBackground(BG_DISPLAY);

        JLabel lblExplicacao = new JLabel("<html><span style='color:#a6adc8;'>Exibe em tempo real os pacotes de rede transmitidos em cada abordagem (ideal para gravação do vídeo do projeto).</span></html>");
        lblExplicacao.setFont(new Font("Segoe UI", Font.PLAIN, 11));

        pnl.add(pnlTitulo, BorderLayout.NORTH);
        pnl.add(scroll, BorderLayout.CENTER);
        pnl.add(lblExplicacao, BorderLayout.SOUTH);

        return pnl;
    }

    private JButton criarBotaoTeclado(String texto) {
        JButton btn = new JButton(texto);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 16));
        btn.setFocusPainted(false);
        btn.setBorder(new LineBorder(BORDER_COLOR, 1, true));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));

        if (texto.equals("=")) {
            btn.setBackground(ACCENT_GREEN);
            btn.setForeground(new Color(17, 17, 27));
        } else if (texto.equals("C") || texto.equals("⌫")) {
            btn.setBackground(ACCENT_RED);
            btn.setForeground(new Color(17, 17, 27));
        } else if (texto.matches("[+\\-*/()]")) {
            btn.setBackground(BTN_OP_BG);
            btn.setForeground(new Color(17, 17, 27));
        } else {
            btn.setBackground(BTN_NUM_BG);
            btn.setForeground(TEXT_PRIMARY);
        }

        btn.addActionListener(e -> processarCliqueBotao(texto));
        return btn;
    }

    private JButton criarBotaoPequeno(String texto, Color cor) {
        JButton btn = new JButton(texto);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 12));
        btn.setBackground(cor);
        btn.setForeground(new Color(17, 17, 27));
        btn.setFocusPainted(false);
        btn.setBorder(new EmptyBorder(6, 12, 6, 12));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        return btn;
    }

    private void estilizarRadioButton(JRadioButton rad) {
        rad.setOpaque(false);
        rad.setForeground(TEXT_PRIMARY);
        rad.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        rad.setFocusPainted(false);
    }

    private void processarCliqueBotao(String valor) {
        if (valor.equals("=")) {
            calcularExpressao();
        } else if (valor.equals("C")) {
            limpar();
        } else if (valor.equals("⌫")) {
            String atual = txtExpressao.getText();
            if (!atual.isEmpty()) {
                txtExpressao.setText(atual.substring(0, atual.length() - 1));
            }
        } else {
            txtExpressao.setText(txtExpressao.getText() + valor);
            txtExpressao.requestFocus();
        }
    }

    private void limpar() {
        txtExpressao.setText("");
        lblResultado.setText("= 0");
        txtExpressao.requestFocus();
    }

    private void log(String msg) {
        SwingUtilities.invokeLater(() -> {
            txtLogRede.append(msg + "\n");
            txtLogRede.setCaretPosition(txtLogRede.getDocument().getLength());
        });
    }

    private void calcularExpressao() {
        String expressao = txtExpressao.getText().trim();
        if (expressao.isEmpty()) return;

        boolean isAbordagem1 = radAbordagem1.isSelected();

        new Thread(() -> {
            log("\n========================================");
            log("🚀 INICIANDO CÁLCULO: " + expressao);
            log("Modo: " + (isAbordagem1 ? "Abordagem 1 (Decomposta no Cliente)" : "Abordagem 2 (Calculada no Servidor)"));

            try {
                if (isAbordagem1) {
                    executarAbordagem1(expressao);
                } else {
                    executarAbordagem2(expressao);
                }
            } catch (Exception ex) {
                log("❌ ERRO: " + ex.getMessage());
                SwingUtilities.invokeLater(() -> {
                    lblResultado.setForeground(ACCENT_RED);
                    lblResultado.setText("= ERRO: " + ex.getMessage());
                });
            }
        }).start();
    }

    private void executarAbordagem1(String expressao) throws IOException {
        log(" [1/3] Analisando expressão e gerando tokens...");
        List<String> tokens = Calculadora.tokenizar(expressao);
        log("       Tokens: " + tokens);

        log(" [2/3] Convertendo para RPN (Shunting-Yard)...");
        List<String> rpn = Calculadora.converterParaRPN(tokens);
        log("       Sequência RPN: " + rpn);

        log(" [3/3] Disparando chamadas Socket remotas individuais:");
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
                    case "+": opCodigo = 1; break;
                    case "-": opCodigo = 2; break;
                    case "/": opCodigo = 3; break;
                    case "*": opCodigo = 4; break;
                }

                log("   ➔ [Passo " + passo++ + "] Socket TCP -> op=" + token + " (" + a + ", " + b + ")");
                long t0 = System.currentTimeMillis();
                double parcial = CalculadoraClientSocket.chamarOperacaoRemota(opCodigo, a, b);
                long rtt = System.currentTimeMillis() - t0;
                log("       ← Servidor retornou: " + parcial + " (" + rtt + " ms)");

                pilha.push(parcial);
            }
        }

        double resultadoFinal = pilha.pop();
        log("🏁 RESULTADO FINAL: " + resultadoFinal);

        SwingUtilities.invokeLater(() -> {
            lblResultado.setForeground(ACCENT_GREEN);
            lblResultado.setText("= " + resultadoFinal);
        });
    }

    private void executarAbordagem2(String expressao) throws IOException {
        log(" [1/2] Abrindo Socket TCP com 127.0.0.1:9090...");
        log("       Enviando string completa da expressão...");
        long t0 = System.currentTimeMillis();
        double resultado = CalculadoraClientSocket.chamarExpressaoRemotaNoServidor(expressao);
        long rtt = System.currentTimeMillis() - t0;

        log(" [2/2] Servidor calculou e retornou via Socket:");
        log("       ← Resposta: " + resultado + " (" + rtt + " ms)");
        log("🏁 RESULTADO FINAL: " + resultado);

        SwingUtilities.invokeLater(() -> {
            lblResultado.setForeground(ACCENT_GREEN);
            lblResultado.setText("= " + resultado);
        });
    }

    private void testarConexaoSilenciosa() {
        new Thread(() -> {
            try {
                CalculadoraClientSocket.chamarOperacaoRemota(1, 0, 0);
                SwingUtilities.invokeLater(() -> {
                    lblStatusConexao.setText("● Servidor Socket: ONLINE (Porta 9090)");
                    lblStatusConexao.setForeground(ACCENT_GREEN);
                });
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> {
                    lblStatusConexao.setText("● Servidor Socket: OFFLINE");
                    lblStatusConexao.setForeground(ACCENT_RED);
                });
            }
        }).start();
    }

    private void testarConexaoExplicita() {
        log("\n--- Testando conexão Socket TCP (127.0.0.1:9090) ---");
        new Thread(() -> {
            try {
                long t0 = System.currentTimeMillis();
                double res = CalculadoraClientSocket.chamarOperacaoRemota(1, 1, 1);
                long rtt = System.currentTimeMillis() - t0;
                log(" Conexão bem-sucedida! Servidor respondeu em " + rtt + " ms (1 + 1 = " + res + ")");
                SwingUtilities.invokeLater(() -> {
                    lblStatusConexao.setText("● Servidor Socket: ONLINE (Porta 9090)");
                    lblStatusConexao.setForeground(ACCENT_GREEN);
                });
            } catch (Exception ex) {
                log("❌ Falha na conexão: " + ex.getMessage());
                log("   Certifique-se de que o CalculadoraServerSocket está rodando!");
                SwingUtilities.invokeLater(() -> {
                    lblStatusConexao.setText("● Servidor Socket: OFFLINE");
                    lblStatusConexao.setForeground(ACCENT_RED);
                });
            }
        }).start();
    }

    public static void main(String[] args) {
        // Habilita renderização de fontes suaves e look and feel moderno
        System.setProperty("awt.useSystemAAFontSettings", "on");
        System.setProperty("swing.aatext", "true");

        SwingUtilities.invokeLater(() -> {
            CalculadoraGUI gui = new CalculadoraGUI();
            gui.setVisible(true);
        });
    }
}
