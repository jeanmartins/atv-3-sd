/**
 * expressaoDecompositor.js
 * Módulo de decomposição de expressões matemáticas no cliente.
 * 
 * Implementa a Abordagem 1 da especificação:
 * A expressão com parênteses (ex.: '(10 + 15) * 4') é analisada e decomposta
 * no cliente em operações básicas atômicas. Cada operação básica (+, -, *, /)
 * é executada através de uma chamada remota HTTP-REST individual ao servidor.
 */

// Divide a expressão matemática em tokens individuais (números, operadores e parênteses)
function tokenizarExpressao(expressao) {
    const tokens = [];
    let i = 0;
    const str = expressao.replace(/\s+/g, ''); // Elimina espaços em branco

    while (i < str.length) {
        const char = str[i];

        // Se for um operador matemático ou parênteses
        if (['+', '-', '*', '/', '(', ')'].includes(char)) {
            // Trata o sinal de menos (-) ou mais (+) como unário caso venha após outro operador ou no início
            if ((char === '-' || char === '+') && (tokens.length === 0 || ['+', '-', '*', '/', '('].includes(tokens[tokens.length - 1]))) {
                let numeroStr = char;
                i++;
                while (i < str.length && /[0-9.]/.test(str[i])) {
                    numeroStr += str[i];
                    i++;
                }
                if (numeroStr === '-' || numeroStr === '+') {
                    tokens.push(char === '-' ? 'UNARY_MINUS' : 'UNARY_PLUS');
                } else {
                    const num = parseFloat(numeroStr);
                    if (isNaN(num)) throw new Error(`Número inválido na expressão: "${numeroStr}"`);
                    tokens.push(num);
                }
                continue;
            }

            tokens.push(char);
            i++;
            continue;
        }

        // Se for um dígito ou separador decimal
        if (/[0-9.]/.test(char)) {
            let numeroStr = '';
            while (i < str.length && /[0-9.]/.test(str[i])) {
                numeroStr += str[i];
                i++;
            }
            const num = parseFloat(numeroStr);
            if (isNaN(num)) throw new Error(`Número inválido na expressão: "${numeroStr}"`);
            tokens.push(num);
            continue;
        }

        throw new Error(`Caractere inválido encontrado na expressão: "${char}"`);
    }

    return tokens;
}

// Algoritmo Shunting-yard para ordenar os tokens em Notação Pós-fixa (Reverse Polish Notation - RPN)
function converterParaRPN(tokens) {
    const saida = [];
    const operadores = [];
    const precedencia = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2,
        'UNARY_MINUS': 3,
        'UNARY_PLUS': 3
    };

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
            if (operadores.length === 0) {
                throw new Error("Parênteses desbalanceados na expressão (falta abertura '(').");
            }
            operadores.pop(); // Remove o '(' correspondente
        }
    }

    while (operadores.length > 0) {
        const op = operadores.pop();
        if (op === '(' || op === ')') {
            throw new Error("Parênteses desbalanceados na expressão (não foi fechado).");
        }
        saida.push(op);
    }

    return saida;
}

/**
 * Avalia a expressão RPN executando CADA operação individualmente no servidor via REST
 * @param {string} expressao - Expressão textual (ex.: "(10 + 15) * 4")
 * @param {CalculadoraRest} calculadora - Instância do cliente REST
 * @param {Function} [callbackPasso] - Função opcional para logar cada chamada remota
 */
async function decomporExpressaoNoCliente(expressao, calculadora, callbackPasso = null) {
    if (!expressao || typeof expressao !== 'string' || expressao.trim() === '') {
        throw new Error("A expressão matemática fornecida não pode estar vazia.");
    }

    const tokens = tokenizarExpressao(expressao);
    const rpn = converterParaRPN(tokens);

    const pilha = [];
    let numeroPasso = 1;

    for (const token of rpn) {
        if (typeof token === 'number') {
            pilha.push(token);
        } else if (token === 'UNARY_MINUS') {
            if (pilha.length < 1) throw new Error("Expressão mal formatada.");
            const val = pilha.pop();

            // Executa negação remota como 0 - val
            if (callbackPasso) {
                callbackPasso(numeroPasso, 0, '-', val);
            }
            const res = await calculadora.subtracao(0, val);
            pilha.push(res);
            numeroPasso++;
        } else if (token === 'UNARY_PLUS') {
            // Unário positivo mantém o valor
        } else if (['+', '-', '*', '/'].includes(token)) {
            if (pilha.length < 2) {
                throw new Error("Expressão mal formatada: faltam operandos para o operador.");
            }
            const b = pilha.pop();
            const a = pilha.pop();

            let resultadoRemoto;

            switch (token) {
                case '+':
                    if (callbackPasso) callbackPasso(numeroPasso, a, '+', b);
                    resultadoRemoto = await calculadora.soma(a, b);
                    break;
                case '-':
                    if (callbackPasso) callbackPasso(numeroPasso, a, '-', b);
                    resultadoRemoto = await calculadora.subtracao(a, b);
                    break;
                case '*':
                    if (callbackPasso) callbackPasso(numeroPasso, a, '*', b);
                    resultadoRemoto = await calculadora.multiplicacao(a, b);
                    break;
                case '/':
                    if (callbackPasso) callbackPasso(numeroPasso, a, '/', b);
                    resultadoRemoto = await calculadora.divisao(a, b);
                    break;
            }

            pilha.push(resultadoRemoto);
            numeroPasso++;
        }
    }

    if (pilha.length !== 1) {
        throw new Error("Expressão matemática inválida ou incompleta.");
    }

    return pilha[0];
}

module.exports = {
    tokenizarExpressao,
    converterParaRPN,
    decomporExpressaoNoCliente
};
