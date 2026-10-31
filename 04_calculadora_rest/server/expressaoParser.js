/**
 * expressaoParser.js
 * Avaliador seguro de expressões matemáticas para o servidor REST.
 * Suporta as 4 operações básicas (+, -, *, /), parênteses e números decimais/negativos.
 * Não utiliza a função perigosa eval(), garantindo segurança contra injeção de código.
 */

// Função que divide a string da expressão em tokens válidos
function tokenizar(expressao) {
    const tokens = [];
    let i = 0;
    const str = expressao.replace(/\s+/g, ''); // Remove todos os espaços em branco

    while (i < str.length) {
        const char = str[i];

        // Se for um operador ou parênteses
        if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
            // Trata o sinal de menos (-) ou mais (+) como unário caso venha após outro operador ou no início
            if ((char === '-' || char === '+') && (tokens.length === 0 || ['+', '-', '*', '/', '('].includes(tokens[tokens.length - 1]))) {
                let numeroStr = char;
                i++;
                while (i < str.length && (/[0-9.]/).test(str[i])) {
                    numeroStr += str[i];
                    i++;
                }
                if (numeroStr === '-' || numeroStr === '+') {
                    // Trata caso de parênteses com sinal unário, ex: -(10 + 2)
                    tokens.push(char === '-' ? 'UNARY_MINUS' : 'UNARY_PLUS');
                } else {
                    const num = parseFloat(numeroStr);
                    if (isNaN(num)) {
                        throw new Error(`Número inválido na expressão: "${numeroStr}"`);
                    }
                    tokens.push(num);
                }
                continue;
            }

            tokens.push(char);
            i++;
            continue;
        }

        // Se for um dígito numérico ou ponto decimal
        if (/[0-9.]/.test(char)) {
            let numeroStr = '';
            while (i < str.length && /[0-9.]/.test(str[i])) {
                numeroStr += str[i];
                i++;
            }
            const num = parseFloat(numeroStr);
            if (isNaN(num)) {
                throw new Error(`Número inválido na expressão: "${numeroStr}"`);
            }
            tokens.push(num);
            continue;
        }

        throw new Error(`Caractere inválido na expressão: "${char}"`);
    }

    return tokens;
}

// Algoritmo Shunting-yard para converter a lista de tokens infixa para notação pós-fixa (RPN)
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
            operadores.pop(); // Remove o '('
        }
    }

    while (operadores.length > 0) {
        const op = operadores.pop();
        if (op === '(' || op === ')') {
            throw new Error("Parênteses desbalanceados na expressão (parênteses não fechados).");
        }
        saida.push(op);
    }

    return saida;
}

// Avalia a notação pós-fixa (RPN)
function avaliarRPN(rpnTokens) {
    const pilha = [];

    for (const token of rpnTokens) {
        if (typeof token === 'number') {
            pilha.push(token);
        } else if (token === 'UNARY_MINUS') {
            if (pilha.length < 1) throw new Error("Expressão mal formatada.");
            const val = pilha.pop();
            pilha.push(-val);
        } else if (token === 'UNARY_PLUS') {
            if (pilha.length < 1) throw new Error("Expressão mal formatada.");
            const val = pilha.pop();
            pilha.push(val);
        } else if (['+', '-', '*', '/'].includes(token)) {
            if (pilha.length < 2) throw new Error("Expressão mal formatada: faltam operandos.");
            const b = pilha.pop();
            const a = pilha.pop();

            let res;
            switch (token) {
                case '+':
                    res = a + b;
                    break;
                case '-':
                    res = a - b;
                    break;
                case '*':
                    res = a * b;
                    break;
                case '/':
                    if (b === 0) {
                        throw new Error("Erro: divisão por zero.");
                    }
                    res = a / b;
                    break;
            }
            pilha.push(res);
        }
    }

    if (pilha.length !== 1) {
        throw new Error("Expressão matemática inválida ou incompleta.");
    }

    return pilha[0];
}

// Função principal exportada para avaliar a expressão
function avaliarExpressao(expressao) {
    if (!expressao || typeof expressao !== 'string' || expressao.trim() === '') {
        throw new Error("Expressão vazia ou inválida.");
    }
    const tokens = tokenizar(expressao);
    const rpn = converterParaRPN(tokens);
    return avaliarRPN(rpn);
}

module.exports = {
    tokenizar,
    converterParaRPN,
    avaliarRPN,
    avaliarExpressao
};
