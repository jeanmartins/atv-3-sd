/**
 * client.js
 * Interface Gráfica Mínima Textual (CLI) do Cliente HTTP-REST.
 * Permite interagir interativamente com a Calculadora Remota,
 * testando as 4 operações básicas, as duas abordagens de expressões
 * e a Política de Resiliência RETRY.
 */

const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const CalculadoraRest = require('./CalculadoraRest');

// Cores ANSI para deixar o terminal profissional e legível
const CORES = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m'
};

// Instância padrão da CalculadoraRest apontando para o servidor local na porta 3000
let configServidor = {
    baseUrl: 'http://localhost:3000',
    maxRetries: 3,
    retryDelayMs: 2000,
    timeoutMs: 5000,
    verbose: true
};

let calculadora = new CalculadoraRest(configServidor.baseUrl, configServidor);

// Função para ler dois operandos numéricos com validação
async function lerDoisNumeros(rl) {
    const strA = await rl.question(`${CORES.cyan}Digite o primeiro operando (oper1): ${CORES.reset}`);
    const strB = await rl.question(`${CORES.cyan}Digite o segundo operando (oper2): ${CORES.reset}`);

    const a = parseFloat(strA.replace(',', '.'));
    const b = parseFloat(strB.replace(',', '.'));

    if (isNaN(a) || isNaN(b)) {
        throw new Error("Entrada inválida. Ambos os valores devem ser numéricos.");
    }

    return { a, b };
}

// Demonstração da política de Retry tentando conectar em uma porta sem servidor
async function demonstrarRetry(rl) {
    console.log(`\n${CORES.yellow}================================================================${CORES.reset}`);
    console.log(`${CORES.yellow}${CORES.bright}         DEMONSTRAÇÃO DA POLÍTICA DE RETRY (Wait Ts and Retry)   ${CORES.reset}`);
    console.log(`${CORES.yellow}================================================================${CORES.reset}`);
    console.log(`Esta rotina simulará uma queda de rede/servidor offline.`);
    console.log(`Será feita uma chamada para uma porta inativa (ex: http://localhost:59999).`);
    console.log(`Parâmetros atuais:`);
    console.log(` - Tentativas Máximas: ${configServidor.maxRetries} (Total de ${1 + configServidor.maxRetries} chamadas)`);
    console.log(` - Tempo de Espera Ts: ${configServidor.retryDelayMs}ms`);
    console.log(`----------------------------------------------------------------`);

    const confirmar = await rl.question(`${CORES.cyan}Deseja iniciar o teste agora? (S/n): ${CORES.reset}`);
    if (confirmar.trim().toLowerCase() === 'n') {
        console.log("Teste cancelado.");
        return;
    }

    // Cria cliente apontando para porta sem serviço
    const clienteOffline = new CalculadoraRest('http://localhost:59999', {
        maxRetries: configServidor.maxRetries,
        retryDelayMs: configServidor.retryDelayMs,
        timeoutMs: 3000,
        verbose: true
    });

    console.log(`\n${CORES.magenta}[INICIANDO] Disparando POST /operacao (10 + 20) para porta offline...${CORES.reset}`);
    const inicio = Date.now();

    try {
        await clienteOffline.soma(10, 20);
        console.log(`${CORES.green}Inesperado: a requisição teve sucesso!${CORES.reset}`);
    } catch (err) {
        const decorrido = ((Date.now() - inicio) / 1000).toFixed(2);
        console.log(`\n${CORES.red}----------------------------------------------------------------${CORES.reset}`);
        console.log(`${CORES.red}${CORES.bright}Resultado do Teste de Retry:${CORES.reset}`);
        console.log(`${CORES.red}✓ Todas as tentativas foram executadas e aguardaram o tempo Ts.${CORES.reset}`);
        console.log(`${CORES.red}✓ Tempo total do ciclo de Retry: ${decorrido} segundos.${CORES.reset}`);
        console.log(`${CORES.red}✓ Mensagem final capturada com segurança:${CORES.reset}`);
        console.log(`  "${err.message}"`);
        console.log(`${CORES.red}----------------------------------------------------------------${CORES.reset}`);
    }
}

// Menu de configurações
async function configurarParametros(rl) {
    console.log(`\n${CORES.blue}--- Configurações do Cliente HTTP-REST ---${CORES.reset}`);
    console.log(`1. URL Base atual: ${configServidor.baseUrl}`);
    console.log(`2. Tentativas Máximas (Retries): ${configServidor.maxRetries}`);
    console.log(`3. Tempo de Espera Ts (ms): ${configServidor.retryDelayMs}`);
    console.log(`0. Voltar`);

    const op = await rl.question(`${CORES.cyan}Escolha o item a alterar: ${CORES.reset}`);
    if (op.trim() === '1') {
        const novaUrl = await rl.question(`Nova URL Base (ex: http://localhost:3000): `);
        if (novaUrl.trim()) configServidor.baseUrl = novaUrl.trim();
    } else if (op.trim() === '2') {
        const novoMax = await rl.question(`Novo número de retentativas (ex: 3): `);
        const val = parseInt(novoMax, 10);
        if (!isNaN(val) && val >= 0) configServidor.maxRetries = val;
    } else if (op.trim() === '3') {
        const novoTs = await rl.question(`Novo tempo Ts em ms (ex: 2000): `);
        const val = parseInt(novoTs, 10);
        if (!isNaN(val) && val >= 100) configServidor.retryDelayMs = val;
    }

    calculadora = new CalculadoraRest(configServidor.baseUrl, configServidor);
    console.log(`${CORES.green}Configurações atualizadas com sucesso!${CORES.reset}`);
}

// Função principal de execução da interface interativa CLI
async function main() {
    const rl = readline.createInterface({ input, output });

    console.clear();
    console.log(`${CORES.cyan}================================================================${CORES.reset}`);
    console.log(`${CORES.cyan}${CORES.bright}      CALCULADORA DISTRIBUÍDA HTTP-REST (SISTEMAS DISTRIBUÍDOS) ${CORES.reset}`);
    console.log(`${CORES.cyan}      Cliente em JavaScript com Suporte a Expressões e Retry    ${CORES.reset}`);
    console.log(`${CORES.cyan}================================================================${CORES.reset}`);

    let executando = true;

    while (executando) {
        console.log(`\n${CORES.bright}Conectado a:${CORES.reset} ${configServidor.baseUrl} | ${CORES.dim}Ts: ${configServidor.retryDelayMs}ms, Max Retries: ${configServidor.maxRetries}${CORES.reset}`);
        console.log(`${CORES.bright}Escolha uma operação:${CORES.reset}`);
        console.log(`  ${CORES.cyan}1${CORES.reset} - Somar (+)`);
        console.log(`  ${CORES.cyan}2${CORES.reset} - Subtrair (-)`);
        console.log(`  ${CORES.cyan}3${CORES.reset} - Multiplicar (*)`);
        console.log(`  ${CORES.cyan}4${CORES.reset} - Dividir (/)`);
        console.log(`  ${CORES.green}5${CORES.reset} - Expressão matemática com parênteses [Abordagem 1: Decomposta no Cliente]`);
        console.log(`  ${CORES.magenta}6${CORES.reset} - Expressão matemática com parênteses [Abordagem 2: Calculada no Servidor]`);
        console.log(`  ${CORES.yellow}7${CORES.reset} - Testar / Demonstrar Política de RETRY (Wait Ts and Retry)`);
        console.log(`  ${CORES.blue}8${CORES.reset} - Configurar URL, Ts e Retentativas`);
        console.log(`  ${CORES.red}0${CORES.reset} - Sair`);

        const opcao = (await rl.question(`\n${CORES.bright}Opção > ${CORES.reset}`)).trim();

        if (opcao === '0') {
            console.log(`\n${CORES.green}Encerrando cliente da calculadora. Até logo!${CORES.reset}`);
            executando = false;
            break;
        }

        try {
            switch (opcao) {
                case '1': { // Soma
                    const { a, b } = await lerDoisNumeros(rl);
                    console.log(`${CORES.dim}[POST /operacao] Enviando: ${a} + ${b}...${CORES.reset}`);
                    const res = await calculadora.soma(a, b);
                    console.log(`\n${CORES.green}${CORES.bright}Resultado: ${a} + ${b} = ${res}${CORES.reset}`);
                    break;
                }
                case '2': { // Subtração
                    const { a, b } = await lerDoisNumeros(rl);
                    console.log(`${CORES.dim}[POST /operacao] Enviando: ${a} - ${b}...${CORES.reset}`);
                    const res = await calculadora.subtracao(a, b);
                    console.log(`\n${CORES.green}${CORES.bright}Resultado: ${a} - ${b} = ${res}${CORES.reset}`);
                    break;
                }
                case '3': { // Multiplicação
                    const { a, b } = await lerDoisNumeros(rl);
                    console.log(`${CORES.dim}[POST /operacao] Enviando: ${a} * ${b}...${CORES.reset}`);
                    const res = await calculadora.multiplicacao(a, b);
                    console.log(`\n${CORES.green}${CORES.bright}Resultado: ${a} * ${b} = ${res}${CORES.reset}`);
                    break;
                }
                case '4': { // Divisão
                    const { a, b } = await lerDoisNumeros(rl);
                    console.log(`${CORES.dim}[POST /operacao] Enviando: ${a} / ${b}...${CORES.reset}`);
                    const res = await calculadora.divisao(a, b);
                    console.log(`\n${CORES.green}${CORES.bright}Resultado: ${a} / ${b} = ${res}${CORES.reset}`);
                    break;
                }
                case '5': { // Abordagem 1: Decomposição no Cliente
                    console.log(`\n${CORES.green}${CORES.bright}--- ABORDAGEM 1: DECOMPOSIÇÃO NO CLIENTE ---${CORES.reset}`);
                    console.log(`Exemplos: (10 + 15) * 4  |  100 / (2 + 3) * 2  |  (50 - 10) / (4 + 6)`);
                    const expr = await rl.question(`${CORES.cyan}Digite a expressão matemática: ${CORES.reset}`);
                    if (!expr.trim()) {
                        console.log(`${CORES.yellow}Expressão em branco. Operação cancelada.${CORES.reset}`);
                        break;
                    }

                    console.log(`${CORES.dim}Decompondo expressão e executando operações atômicas no servidor...${CORES.reset}`);
                    const callbackPasso = (passo, a, op, b) => {
                        console.log(`  ${CORES.cyan}↳ [Passo ${passo}]${CORES.reset} Chamada remota POST /operacao: ${a} ${op} ${b}`);
                    };

                    const res = await calculadora.calcularExpressaoCliente(expr, callbackPasso);
                    console.log(`\n${CORES.green}${CORES.bright}✓ Resultado Final da Expressão: ${expr} = ${res}${CORES.reset}`);
                    break;
                }
                case '6': { // Abordagem 2: Calculada no Servidor
                    console.log(`\n${CORES.magenta}${CORES.bright}--- ABORDAGEM 2: CÁLCULO NO SERVIDOR ---${CORES.reset}`);
                    console.log(`Exemplos: (10 + 15) * 4  |  100 / (2 + 3) * 2  |  (50 - 10) / (4 + 6)`);
                    const expr = await rl.question(`${CORES.cyan}Digite a expressão matemática: ${CORES.reset}`);
                    if (!expr.trim()) {
                        console.log(`${CORES.yellow}Expressão em branco. Operação cancelada.${CORES.reset}`);
                        break;
                    }

                    console.log(`${CORES.dim}[POST /expressao] Enviando expressão inteira para o servidor...${CORES.reset}`);
                    const res = await calculadora.calcularExpressaoServidor(expr);
                    console.log(`\n${CORES.green}${CORES.bright}✓ Resultado Final retornado pelo Servidor: ${expr} = ${res}${CORES.reset}`);
                    break;
                }
                case '7': { // Testar Retry
                    await demonstrarRetry(rl);
                    break;
                }
                case '8': { // Configurações
                    await configurarParametros(rl);
                    break;
                }
                default:
                    console.log(`${CORES.red}Opção inválida. Por favor, escolha um número de 0 a 8.${CORES.reset}`);
            }
        } catch (erro) {
            console.log(`\n${CORES.red}${CORES.bright}[ERRO NA OPERAÇÃO]: ${erro.message}${CORES.reset}`);
        }

        console.log(`\n----------------------------------------------------------------`);
    }

    rl.close();
}

// Ponto de entrada do script CLI
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
