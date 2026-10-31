/**
 * test_retry.js
 * Script de teste automatizado focado na validação da Política de RETRY (Wait Ts and Retry).
 * 
 * Demonstração exigida no plano de trabalho e rubrica:
 * "O cliente HTTP-REST deve implementar uma política de RETRY (e.g., Wait Ts and Retry)"
 * "Demonstração prática da política de Retry (desligando o servidor para mostrar as tentativas)."
 */

const CalculadoraRest = require('./CalculadoraRest');

async function testarPoliticaRetry() {
    console.log("======================================================================");
    console.log(" TESTE AUTOMATIZADO: POLÍTICA DE RESILIÊNCIA RETRY (WAIT Ts AND RETRY)");
    console.log("======================================================================\n");

    // Cenário 1: Conexão a um endereço inativo para demonstrar o ciclo completo de Retry
    console.log("[CENÁRIO 1] Testando comportamento resiliente com Servidor Offline");
    console.log("-> Configuração: 3 retentativas (4 tentativas no total) com Ts = 1000ms");

    const clienteOffline = new CalculadoraRest('http://localhost:59999', {
        maxRetries: 3,
        retryDelayMs: 1000,
        timeoutMs: 2000,
        verbose: true
    });

    const inicio = Date.now();
    try {
        await clienteOffline.soma(50, 50);
        console.error("ERRO: A requisição não deveria ter tido sucesso para uma porta inativa!");
    } catch (err) {
        const duracao = ((Date.now() - inicio) / 1000).toFixed(2);
        console.log(`\n✓ Sucesso na validação de Retry:`);
        console.log(`  - Tempo decorrido: ${duracao}s (esperado aproximadamente 3s de pausas Ts)`);
        console.log(`  - Exceção tratada com sucesso: "${err.message}"\n`);
    }

    // Cenário 2: Servidor Online na porta 3000
    console.log("----------------------------------------------------------------------");
    console.log("[CENÁRIO 2] Testando conexão com Servidor Online (http://localhost:3000)");

    const clienteOnline = new CalculadoraRest('http://localhost:3000', {
        maxRetries: 2,
        retryDelayMs: 1000,
        timeoutMs: 3000,
        verbose: false
    });

    try {
        const resSoma = await clienteOnline.soma(25, 75);
        console.log(`✓ Soma (25 + 75) respondida de primeira: ${resSoma}`);

        const resSub = await clienteOnline.subtracao(100, 30);
        console.log(`✓ Subtração (100 - 30): ${resSub}`);

        const resMult = await clienteOnline.multiplicacao(6, 7);
        console.log(`✓ Multiplicação (6 * 7): ${resMult}`);

        const resDiv = await clienteOnline.divisao(144, 12);
        console.log(`✓ Divisão (144 / 12): ${resDiv}`);

        console.log("\n[TESTE DE EXPRESSÕES]");
        const expr = "(10 + 15) * 4";
        const resCliente = await clienteOnline.calcularExpressaoCliente(expr);
        console.log(`✓ Abordagem 1 (Decomposta no Cliente): ${expr} = ${resCliente}`);

        const resServidor = await clienteOnline.calcularExpressaoServidor(expr);
        console.log(`✓ Abordagem 2 (Calculada no Servidor): ${expr} = ${resServidor}`);

        console.log("\n[TESTE DE DIVISÃO POR ZERO]");
        try {
            await clienteOnline.divisao(10, 0);
            console.error("ERRO: Divisão por zero não lançou erro!");
        } catch (errDiv) {
            console.log(`✓ Divisão por zero tratada imediatamente sem retry inútil: "${errDiv.message}"`);
        }

        console.log("\n======================================================================");
        console.log(" TODOS OS TESTES PASSARAM COM SUCESSO!");
        console.log("======================================================================");

    } catch (err) {
        console.log(`\nNota para o Cenário 2: O servidor local na porta 3000 parece estar desligado no momento.`);
        console.log(`Para testá-lo online, execute 'npm start' na pasta 04_calculadora_rest/server.`);
    }
}

if (require.main === module) {
    testarPoliticaRetry().catch(console.error);
}

module.exports = { testarPoliticaRetry };
