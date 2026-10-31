/**
 * app.js
 * Lógica do Cliente Web Visual da Calculadora REST.
 * Conecta a interface gráfica aos endpoints HTTP-REST do servidor,
 * implementando decomposição no cliente, cálculo no servidor e política de Retry.
 */

let currentMode = 'client_mode'; // 'client_mode' | 'server_mode' | 'direct'
const displayInput = document.getElementById('displayInput');
const displayResult = document.getElementById('displayResult');
const displayHistory = document.getElementById('displayHistory');
const networkLog = document.getElementById('networkLog');

// Obtém a URL base atual da página ou fallback
function getBaseUrl() {
    const simularOffline = document.getElementById('cfgSimularOffline').checked;
    if (simularOffline) {
        // Envia para uma porta onde eu espero não tenha servidor para forçar erro de conexão e demonstrar o Retry
        return 'http://localhost:59999';
    }
    return window.location.origin;
}

// Configuração de Retry selecionada pelo usuário na interface
function getRetryConfig() {
    const maxRetries = parseInt(document.getElementById('cfgRetries').value, 10) || 3;
    const retryDelayMs = parseInt(document.getElementById('cfgDelay').value, 10) || 2000;
    return { maxRetries, retryDelayMs };
}

// Função utilitária para adicionar entradas de log coloridas no painel de telemetria
function logNetwork(msg, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const now = new Date();
    const timeStr = `[${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}]`;

    entry.innerHTML = `<span class="log-time">${timeStr}</span> <span class="log-msg">${msg}</span>`;
    networkLog.appendChild(entry);
    networkLog.scrollTop = networkLog.scrollHeight;
}

function limparLogs() {
    networkLog.innerHTML = '';
    logNetwork('Log limpo pelo usuário.', 'info');
}

// Função de requisição HTTP POST resiliente com política Wait Ts and Retry
async function postComRetry(url, payload) {
    const { maxRetries, retryDelayMs } = getRetryConfig();
    const maxTentativas = 1 + maxRetries;

    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        logNetwork(`Enviando POST para ${url} (Tentativa ${tentativa}/${maxTentativas})...`, 'step');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Se for erro de validação do cliente (ex: divisão por zero ou parâmetros incorretos)
                if (response.status === 400) {
                    logNetwork(`Servidor respondeu HTTP 400: ${data.erro || 'Erro na requisição'}`, 'error');
                    throw new Error(data.erro || 'Erro 400 nos parâmetros da requisição.');
                }

                // Erros de servidor (5xx) são passíveis de retry
                throw new Error(`Servidor retornou HTTP ${response.status}: ${data.erro || response.statusText}`);
            }

            if (tentativa > 1) {
                logNetwork(`✅ Sucesso na tentativa ${tentativa} após falhas anteriores!`, 'success');
            } else {
                logNetwork(`✅ Resposta 200 OK recebida do servidor com sucesso.`, 'success');
            }

            return data;
        } catch (err) {
            const isErroDeNegocio = err.message && (err.message.includes('divisão por zero') || err.message.includes('Erro:'));
            if (isErroDeNegocio) {
                // Erros da regra de negócio não devem ser repetidos
                throw err;
            }

            if (tentativa < maxTentativas) {
                logNetwork(`⚠️ Tentativa ${tentativa} falhou: ${err.message}.`, 'retry');
                logNetwork(`⏳ Aguardando Ts = ${retryDelayMs}ms antes de tentar novamente...`, 'retry');
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            } else {
                logNetwork(`❌ Todas as ${maxTentativas} tentativas falharam. Servidor inalcançável.`, 'error');
                throw new Error(`Falha após ${maxTentativas} tentativas: ${err.message}`);
            }
        }
    }
}

// Alternância entre os Modos da Calculadora
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const directContainer = document.getElementById('directInputsContainer');
    const keypadContainer = document.getElementById('keypadContainer');

    if (mode === 'client_mode') {
        document.getElementById('tabExprClient').classList.add('active');
        directContainer.style.display = 'none';
        keypadContainer.style.display = 'grid';
        displayHistory.innerText = 'Modo: Expressão Decomposta no Cliente (REST step-by-step)';
    } else if (mode === 'server_mode') {
        document.getElementById('tabExprServer').classList.add('active');
        directContainer.style.display = 'none';
        keypadContainer.style.display = 'grid';
        displayHistory.innerText = 'Modo: Expressão Calculada no Servidor (REST string)';
    } else {
        document.getElementById('tabDirect').classList.add('active');
        directContainer.style.display = 'flex';
        keypadContainer.style.display = 'none';
        displayHistory.innerText = 'Modo: Operação Individual Direta (POST /operacao)';
    }
}

// Manipulação do teclado e display
function appendToken(token) {
    displayInput.value += token;
    displayInput.focus();
}

function clearDisplay() {
    displayInput.value = '';
    displayResult.innerText = '= 0';
    displayResult.className = 'display-result';
    displayHistory.innerText = 'Display limpo.';
}

function backspace() {
    displayInput.value = displayInput.value.trimEnd().slice(0, -1);
}

function carregarExemplo(expr) {
    displayInput.value = expr;
    if (currentMode === 'direct') setMode('client_mode');
}

// Execução da Operação Individual Direta
async function executarCalculoDireto() {
    const oper1 = parseFloat(document.getElementById('directOper1').value);
    const oper2 = parseFloat(document.getElementById('directOper2').value);
    const operacao = parseInt(document.getElementById('directOperacao').value, 10);

    if (isNaN(oper1) || isNaN(oper2)) {
        alert('Por favor, informe números válidos para ambos os operandos.');
        return;
    }

    const baseUrl = getBaseUrl();
    const endpoint = `${baseUrl}/operacao`;

    try {
        logNetwork(`--- INÍCIO DA OPERAÇÃO INDIVIDUAL DIRETA ---`, 'info');
        const data = await postComRetry(endpoint, { oper1, oper2, operacao });
        displayResult.className = 'display-result';
        displayResult.innerText = `= ${data.resultado}`;
        displayHistory.innerText = `Operação: ${oper1} op(${operacao}) ${oper2}`;
        logNetwork(`Resultado da operação direta: ${data.resultado}`, 'success');
    } catch (err) {
        displayResult.className = 'display-result error';
        displayResult.innerText = `Erro: ${err.message}`;
        logNetwork(`Falha na operação: ${err.message}`, 'error');
    }
}

// Avaliação de expressões matemáticas
async function calcularExpressao() {
    const expressao = displayInput.value.trim();
    if (!expressao) {
        alert('Digite uma expressão matemática antes de calcular.');
        return;
    }

    displayHistory.innerText = `Processando: ${expressao}`;
    displayResult.className = 'display-result';
    displayResult.innerText = 'Calculando...';

    const baseUrl = getBaseUrl();

    if (currentMode === 'server_mode') {
        // ABORDAGEM 2: Envia a string completa para o servidor calcular
        logNetwork(`--- ABORDAGEM 2: CÁLCULO TOTAL NO SERVIDOR ---`, 'info');
        logNetwork(`Enviando expressão inteira para POST /expressao: "${expressao}"`, 'info');

        try {
            const data = await postComRetry(`${baseUrl}/expressao`, { expressao });
            displayResult.className = 'display-result';
            displayResult.innerText = `= ${data.resultado}`;
            displayHistory.innerText = `${expressao} = ${data.resultado}`;
            logNetwork(`Resultado retornado pelo servidor: ${data.resultado}`, 'success');
        } catch (err) {
            displayResult.className = 'display-result error';
            displayResult.innerText = `Erro: ${err.message}`;
            logNetwork(`Erro no cálculo remoto: ${err.message}`, 'error');
        }
    } else {
        // ABORDAGEM 1: Decompõe no cliente e invoca cada operação no servidor via POST
        logNetwork(`--- ABORDAGEM 1: DECOMPOSIÇÃO NO CLIENTE ---`, 'info');
        logNetwork(`Analisando sintaxe da expressão no cliente: "${expressao}"`, 'info');

        try {
            const resultado = await decomporEEvaluarNoCliente(expressao, baseUrl);
            displayResult.className = 'display-result';
            displayResult.innerText = `= ${resultado}`;
            displayHistory.innerText = `${expressao} = ${resultado}`;
            logNetwork(`✅ Expressão concluída com sucesso! Resultado final: ${resultado}`, 'success');
        } catch (err) {
            displayResult.className = 'display-result error';
            displayResult.innerText = `Erro: ${err.message}`;
            logNetwork(`Erro na decomposição/execução: ${err.message}`, 'error');
        }
    }
}

// Decompositor no cliente usando Shunting-yard e chamadas remotas assíncronas para cada operador
async function decomporEEvaluarNoCliente(expressao, baseUrl) {
    const tokens = tokenizarLocal(expressao);
    const rpn = converterParaRPNLocal(tokens);

    logNetwork(`Expressão convertida para RPN (Notação Pós-fixa): [${rpn.join(', ')}]`, 'info');

    const pilha = [];
    let passo = 1;

    for (const token of rpn) {
        if (typeof token === 'number') {
            pilha.push(token);
        } else if (token === 'UNARY_MINUS') {
            if (pilha.length < 1) throw new Error("Expressão mal formatada.");
            const val = pilha.pop();
            // Negação unária simulada como 0 - val remotamente
            logNetwork(`[Passo ${passo++}] Negação unária de ${val} enviada ao servidor (0 - ${val})...`, 'step');
            const res = await postComRetry(`${baseUrl}/operacao`, { oper1: 0, oper2: val, operacao: 2 });
            pilha.push(res.resultado);
        } else if (token === 'UNARY_PLUS') {
            // Unário positivo mantém o valor
        } else if (['+', '-', '*', '/'].includes(token)) {
            if (pilha.length < 2) throw new Error("Expressão mal formatada: faltam operandos.");
            const b = pilha.pop();
            const a = pilha.pop();

            let opCode = 1;
            let opNome = 'Soma';
            if (token === '+') { opCode = 1; opNome = 'Soma'; }
            if (token === '-') { opCode = 2; opNome = 'Subtração'; }
            if (token === '*') { opCode = 3; opNome = 'Multiplicação'; }
            if (token === '/') { opCode = 4; opNome = 'Divisão'; }

            logNetwork(`[Passo ${passo++}] Chamada remota POST /operacao: ${a} ${token} ${b} (${opNome})...`, 'step');
            const res = await postComRetry(`${baseUrl}/operacao`, { oper1: a, oper2: b, operacao: opCode });
            logNetwork(`↳ Servidor respondeu: ${a} ${token} ${b} = ${res.resultado}`, 'success');
            pilha.push(res.resultado);
        }
    }

    if (pilha.length !== 1) {
        throw new Error("Expressão inválida ou incompleta.");
    }

    return pilha[0];
}

// Tokenizador seguro do cliente
function tokenizarLocal(expr) {
    const tokens = [];
    let i = 0;
    const str = expr.replace(/\s+/g, '');

    while (i < str.length) {
        const char = str[i];
        if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
            if ((char === '-' || char === '+') && (tokens.length === 0 || ['+', '-', '*', '/', '('].includes(tokens[tokens.length - 1]))) {
                let numeroStr = char;
                i++;
                while (i < str.length && (/[0-9.]/).test(str[i])) {
                    numeroStr += str[i];
                    i++;
                }
                if (numeroStr === '-' || numeroStr === '+') {
                    tokens.push(char === '-' ? 'UNARY_MINUS' : 'UNARY_PLUS');
                } else {
                    const num = parseFloat(numeroStr);
                    if (isNaN(num)) throw new Error(`Número inválido: "${numeroStr}"`);
                    tokens.push(num);
                }
                continue;
            }
            tokens.push(char);
            i++;
            continue;
        }

        if (/[0-9.]/.test(char)) {
            let numeroStr = '';
            while (i < str.length && /[0-9.]/.test(str[i])) {
                numeroStr += str[i];
                i++;
            }
            const num = parseFloat(numeroStr);
            if (isNaN(num)) throw new Error(`Número inválido: "${numeroStr}"`);
            tokens.push(num);
            continue;
        }

        throw new Error(`Caractere inválido na expressão: "${char}"`);
    }

    return tokens;
}

// Algoritmo Shunting-yard local
function converterParaRPNLocal(tokens) {
    const saida = [];
    const operadores = [];
    const precedencia = { '+': 1, '-': 1, '*': 2, '/': 2, 'UNARY_MINUS': 3, 'UNARY_PLUS': 3 };

    for (const token of tokens) {
        if (typeof token === 'number') {
            saida.push(token);
        } else if (token === 'UNARY_MINUS' || token === 'UNARY_PLUS') {
            operadores.push(token);
        } else if (['+', '-', '*', '/'].includes(token)) {
            while (
                operadores.length > 0 &&
                operadores[operadores.length - 1] !== '(' &&
                precedencia[operadores[operadores.length - 1]] >= precedencia[token]
            ) {
                saida.push(operadores.pop());
            }
            operadores.push(token);
        } else if (token === '(') {
            operadores.push(token);
        } else if (token === ')') {
            while (operadores.length > 0 && operadores[operadores.length - 1] !== '(') {
                saida.push(operadores.pop());
            }
            if (operadores.length === 0) throw new Error("Parênteses desbalanceados.");
            operadores.pop();
        }
    }

    while (operadores.length > 0) {
        const op = operadores.pop();
        if (op === '(' || op === ')') throw new Error("Parênteses desbalanceados.");
        saida.push(op);
    }

    return saida;
}

// Suporte a pressionar Enter no campo de expressão
displayInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        calcularExpressao();
    }
});
