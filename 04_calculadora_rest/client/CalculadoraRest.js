/**
 * CalculadoraRest.js
 * Classe de comunicação HTTP REST do Cliente da Calculadora.
 * Evolução da classe HTTPS Python do professor para JavaScript (Node.js).
 * Implementa suporte a todas as 4 operações básicas (+, -, *, /),
 * avaliação de expressões (remota no servidor e decomposta no cliente),
 * e a Política de Resiliência RETRY (Wait Ts and Retry).
 * 
 * ATENÇÃO: Conforme o requisito 3 da especificação, cada linha de comando
 * desta classe de comunicação está comentada detalhando a sua função.
 */

// Importa o decompositor local de expressões que invoca chamadas REST atômicas no servidor
const { decomporExpressaoNoCliente } = require('./expressaoDecompositor');

// Declara a classe de comunicação HTTP-REST CalculadoraRest
class CalculadoraRest {

    // Construtor da classe que inicializa as configurações de rede e política de retry
    constructor(baseUrl = 'http://localhost:3000', options = {}) {
        // Remove barras finais da URL base fornecida para padronizar os endpoints
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        // Define o número máximo de retentativas (padrão de 3 tentativas após a primeira falha)
        this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
        // Define o tempo de espera Ts em milissegundos entre as retentativas (padrão de 2000 ms)
        this.retryDelayMs = options.retryDelayMs !== undefined ? options.retryDelayMs : 2000;
        // Define o tempo limite (timeout) de espera por resposta para cada requisição (padrão de 5000 ms)
        this.timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : 5000;
        // Habilita ou desabilita logs verbosos de cada tentativa no terminal (padrão habilitado)
        this.verbose = options.verbose !== undefined ? options.verbose : true;
    }

    // Função utilitária interna para pausar a execução assíncrona por um tempo determinado em milissegundos
    dormir(ms) {
        // Retorna uma Promise que resolve após o tempo especificado pela função setTimeout
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Método central de comunicação de rede que implementa a política de RETRY (Wait Ts and Retry)
    async requisicaoComRetry(endpoint, corpoJson) {
        // Constrói a URL completa juntando a URL base ao caminho do endpoint relativo
        const urlCompleta = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        // Calcula o número total máximo de tentativas permitidas (1 tentativa inicial + retentativas)
        const totalTentativas = 1 + this.maxRetries;

        // Inicia o laço de repetição que controla as tentativas sequenciais
        for (let tentativa = 1; tentativa <= totalTentativas; tentativa++) {
            // Cria um controlador de cancelamento AbortController para impor o tempo de timeout
            const controller = new AbortController();
            // Agenda o cancelamento da requisição caso o timeout configurado seja atingido
            const timerTimeout = setTimeout(() => controller.abort(), this.timeoutMs);

            // Bloco de tratamento de erros para captura de falhas de transporte, timeout e rede
            try {
                // Se o modo detalhado estiver ativado e for uma retentativa, emite aviso no console
                if (this.verbose && tentativa > 1) {
                    // Exibe a mensagem indicando o número da tentativa em andamento
                    console.log(`[RETRY] Executando tentativa ${tentativa} de ${totalTentativas} para: ${urlCompleta}`);
                }

                // Executa a chamada HTTP POST usando o fetch nativo do Node.js
                const resposta = await fetch(urlCompleta, {
                    // Especifica o método HTTP como POST conforme a especificação do projeto
                    method: 'POST',
                    // Define o cabeçalho Content-Type indicando que o corpo é um objeto JSON
                    headers: { 'Content-Type': 'application/json' },
                    // Serializa o objeto JavaScript para uma string JSON no corpo da requisição
                    body: JSON.stringify(corpoJson),
                    // Vincula o sinal de cancelamento para abortar em caso de timeout
                    signal: controller.signal
                });

                // Cancela o timer de timeout uma vez que os cabeçalhos da resposta foram recebidos
                clearTimeout(timerTimeout);

                // Faz a leitura e o parsing do corpo da resposta HTTP em formato JSON
                const dados = await resposta.json().catch(() => ({}));

                // Se o status HTTP for de sucesso (faixa 200 a 299)
                if (resposta.ok) {
                    // Se foi bem-sucedido após uma ou mais falhas prévias, registra a recuperação
                    if (this.verbose && tentativa > 1) {
                        // Exibe confirmação de recuperação e resiliência bem-sucedida
                        console.log(`[RETRY] Conexao restabelecida com sucesso na tentativa ${tentativa}!`);
                    }
                    // Extrai o resultado numérico priorizando o campo 'resultado' (PHP) ou 'result' (Python)
                    const resultadoFinal = dados.resultado !== undefined ? dados.resultado : dados.result;
                    // Retorna o valor numérico obtido da operação
                    return resultadoFinal;
                }

                // Se o status HTTP for 400 (Bad Request), trata-se de um erro de validação ou divisão por zero
                if (resposta.status === 400) {
                    // Extrai a mensagem de erro retornada pelo servidor
                    const mensagemErro = dados.erro || dados.error || 'Parametros invalidos na requisicao.';
                    // Lança uma exceção imediatamente, pois erros 4xx não são falhas transitórias de rede
                    throw new Error(mensagemErro);
                }

                // Para códigos HTTP 5xx (erro interno do servidor), lança exceção para acionar a política de retry
                throw new Error(`Servidor retornou status HTTP ${resposta.status}: ${dados.erro || resposta.statusText}`);

            } catch (erroCapturado) {
                // Garante que o timer de timeout seja limpo mesmo em caso de erro prematuro
                clearTimeout(timerTimeout);

                // Se o erro foi gerado por regra de negócio (divisão por zero ou parâmetros incorretos)
                const ehErroNegocio = erroCapturado.message && (
                    erroCapturado.message.includes('divisao por zero') ||
                    erroCapturado.message.includes('divisão por zero') ||
                    erroCapturado.message.includes('Parametros invalidos') ||
                    erroCapturado.message.includes('Parâmetros inválidos') ||
                    erroCapturado.message.includes('Operacao invalida') ||
                    erroCapturado.message.includes('Operação inválida')
                );

                // Não retenta erros causados por regras de negócio inválidas, repassando o erro imediatamente
                if (ehErroNegocio) {
                    // Propaga o erro de negócio sem esperar nem repetir
                    throw erroCapturado;
                }

                // Identifica se ainda restam tentativas disponíveis
                const aindaTemTentativas = tentativa < totalTentativas;

                // Se ainda houver tentativas restantes, aplica a política Wait Ts and Retry
                if (aindaTemTentativas) {
                    // Se o modo detalhado estiver ativado, imprime informações da falha e da espera
                    if (this.verbose) {
                        // Exibe mensagem de falha da tentativa atual e o motivo
                        console.warn(`[RETRY] Tentativa ${tentativa} falhou: ${erroCapturado.message}`);
                        // Exibe a indicação de espera pelo tempo Ts antes da próxima tentativa
                        console.warn(`[RETRY] Aguardando Ts = ${this.retryDelayMs}ms antes de tentar novamente...`);
                    }
                    // Pausa a execução assíncrona pelo tempo de espera Ts configurado
                    await this.dormir(this.retryDelayMs);
                } else {
                    // Se esgotou todas as tentativas, lança erro definitivo com diagnóstico completo
                    throw new Error(
                        `Falha de comunicacao: Limite de ${totalTentativas} tentativas excedido para '${urlCompleta}'. Ultimo erro: ${erroCapturado.message}`
                    );
                }
            }
        }
    }

    // Método genérico para disparar uma operação aritmética básica via POST para o servidor
    async operacao(param1, param2, codigoOperacao) {
        // Monta o payload JSON compatível tanto com o script PHP do professor quanto com o Node
        const payload = {
            // Primeiro operando
            oper1: param1,
            // Segundo operando
            oper2: param2,
            // Código numérico da operação (1: soma, 2: subtracao, 3: multiplicacao, 4: divisao)
            operacao: codigoOperacao
        };

        // Realiza a chamada HTTP POST no endpoint '/operacao' aplicando a política de Retry
        return await this.requisicaoComRetry('/operacao', payload);
    }

    // Operação 1: Soma (a + b) via HTTP-REST
    async soma(param1, param2) {
        // Invoca o método operacao informando o código 1 correspondente à Soma
        return await this.operacao(param1, param2, 1);
    }

    // Operação 2: Subtração (a - b) via HTTP-REST
    async subtracao(param1, param2) {
        // Invoca o método operacao informando o código 2 correspondente à Subtração
        return await this.operacao(param1, param2, 2);
    }

    // Operação 3: Multiplicação (a * b) via HTTP-REST
    async multiplicacao(param1, param2) {
        // Invoca o método operacao informando o código 3 correspondente à Multiplicação
        return await this.operacao(param1, param2, 3);
    }

    // Operação 4: Divisão (a / b) via HTTP-REST
    async divisao(param1, param2) {
        // Invoca o método operacao informando o código 4 correspondente à Divisão
        return await this.operacao(param1, param2, 4);
    }

    // Abordagem 2: Envia a string inteira da expressão com parênteses para ser calculada no servidor
    async calcularExpressaoServidor(expressao) {
        // Monta o payload contendo o campo textual 'expressao'
        const payload = { expressao: expressao };
        // Dispara a requisição POST para o endpoint dedicado '/expressao' com política de Retry
        return await this.requisicaoComRetry('/expressao', payload);
    }

    // Abordagem 1: Decompõe a expressão no cliente e invoca chamadas REST atômicas para cada operador
    async calcularExpressaoCliente(expressao, callbackPasso = null) {
        // Delega para o decompositor cliente que invoca as operações básicas desta instância da classe
        return await decomporExpressaoNoCliente(expressao, this, callbackPasso);
    }
}

// Exporta a classe CalculadoraRest para ser importada pelo CLI e outros scripts
module.exports = CalculadoraRest;
