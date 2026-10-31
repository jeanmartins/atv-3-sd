/**
 * Importações
 * - Express pra gerenciar rotas e requisições
 * - CORS pra permitir requisições de diferentes origens/clientes
 * - Path pra permitir manipula~çao de caminhos de arquivo
 * - avalidarExpressão importa o expressãoParser, criado pra validar as expressões e suportar o uso de parênteses.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { avaliarExpressao } = require('./expressaoParser');

// Instancia a aplicação servidora.
const app = express();

// Define a porta em que o servidor HTTP REST irá escutar (3000 por padrão ou variável de ambiente)
const PORT = process.env.PORT || 3000;

// Habilita o middleware CORS para aceitar requisições de clientes em qualquer porta ou navegador
app.use(cors());

// Habilita o parsing de corpos de requisição no formato JSON (Content-Type: application/json)
app.use(express.json());

// Habilita o parsing de formulários codificados na URL (Content-Type: application/x-www-form-urlencoded), compatível com o $_POST do PHP
app.use(express.urlencoded({ extended: true }));

// Serve arquivos estáticos da pasta "public" para fornecer a Interface Gráfica Web da calculadora
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de log para registrar todas as requisições HTTP recebidas no console do servidor
app.use((req, res, next) => {
    // Registra no console o método HTTP, o caminho da requisição e o horário de recebimento
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    // Passa o controle para o próximo manipulador de rota da aplicação
    next();
});

// Função utilitária para extrair e validar valores numéricos enviados no corpo ou nos parâmetros da rota
function extrairParametros(req) {
    // Inicializa a variável para o primeiro operando
    let oper1 = null;
    // Inicializa a variável para o segundo operando
    let oper2 = null;
    // Inicializa a variável para a identificação da operação desejada
    let operacao = null;

    // Verifica se os valores foram fornecidos no corpo da requisição (JSON ou form POST)
    if (req.body) {
        // Atribui oper1 considerando as chaves 'oper1', 'param1' ou 'a'
        if (req.body.oper1 !== undefined) oper1 = parseFloat(req.body.oper1);
        else if (req.body.param1 !== undefined) oper1 = parseFloat(req.body.param1);
        else if (req.body.a !== undefined) oper1 = parseFloat(req.body.a);

        // Atribui oper2 considerando as chaves 'oper2', 'param2' ou 'b'
        if (req.body.oper2 !== undefined) oper2 = parseFloat(req.body.oper2);
        else if (req.body.param2 !== undefined) oper2 = parseFloat(req.body.param2);
        else if (req.body.b !== undefined) oper2 = parseFloat(req.body.b);

        // Atribui operacao considerando as chaves 'operacao' ou 'operation'
        if (req.body.operacao !== undefined) operacao = req.body.operacao;
        else if (req.body.operation !== undefined) operacao = req.body.operation;
    }

    // Se os parâmetros vierem pela URL (ex.: /soma/:param1/:param2)
    if (req.params) {
        // Se param1 estiver na URL e oper1 ainda não foi preenchido, converte para número
        if (req.params.param1 !== undefined && isNaN(oper1)) oper1 = parseFloat(req.params.param1);
        // Se param2 estiver na URL e oper2 ainda não foi preenchido, converte para número
        if (req.params.param2 !== undefined && isNaN(oper2)) oper2 = parseFloat(req.params.param2);
    }

    // Retorna os valores extraídos e estruturados
    return { oper1, oper2, operacao };
}

// Função central que executa a operação aritmética básica solicitada
function executarCalculo(oper1, oper2, operacao) {
    // Normaliza o código da operação se for string (ex: 'soma', 'subtracao', ou números em texto)
    let opCode = operacao;
    // Se for string com valor '1', '2', '3', '4', converte para número inteiro
    if (typeof opCode === 'string' && ['1', '2', '3', '4'].includes(opCode.trim())) {
        opCode = parseInt(opCode.trim(), 10);
    }

    // Mapeia nomes textuais de operações para códigos numéricos equivalentes ao script PHP do professor
    if (opCode === 'soma' || opCode === '+') opCode = 1;
    if (opCode === 'subtracao' || opCode === 'sub' || opCode === '-') opCode = 2;
    if (opCode === 'multiplicacao' || opCode === 'mult' || opCode === '*') opCode = 3;
    if (opCode === 'divisao' || opCode === 'div' || opCode === '/') opCode = 4;

    // Inicializa a variável que armazenará o resultado do cálculo
    let resultado = null;
    // Inicializa a variável que armazenará eventuais mensagens de erro
    let erro = null;

    // Valida se os operandos são números válidos
    if (isNaN(oper1) || isNaN(oper2) || oper1 === null || oper2 === null) {
        // Define a mensagem de erro para parâmetros inválidos ou ausentes
        erro = "Parâmetros inválidos. Envie 'oper1' e 'oper2' numéricos via POST.";
        // Retorna imediatamente o erro com resultado nulo
        return { resultado: null, erro, operacao: opCode };
    }

    // Executa a operação matemática correspondente com base no código selecionado
    switch (opCode) {
        case 1: // Operação 1: Soma
            resultado = oper1 + oper2; // Realiza a adição dos operandos
            break; // Finaliza o bloco do switch
        case 2: // Operação 2: Subtração
            resultado = oper1 - oper2; // Realiza a subtração dos operandos
            break; // Finaliza o bloco do switch
        case 3: // Operação 3: Multiplicação
            resultado = oper1 * oper2; // Realiza o produto dos operandos
            break; // Finaliza o bloco do switch
        case 4: // Operação 4: Divisão
            if (oper2 === 0) { // Verifica se o divisor é zero
                erro = "Erro: divisão por zero."; // Define a mensagem de erro conforme especificação
            } else {
                resultado = oper1 / oper2; // Realiza o quociente dos operandos
            }
            break; // Finaliza o bloco do switch
        default: // Caso nenhuma operação válida seja fornecida
            erro = "Operação inválida. Use 1 (soma), 2 (subtração), 3 (multiplicação) ou 4 (divisão)."; // Define a mensagem de erro
    }

    // Retorna o resultado obtido, o erro (caso exista) e o código numérico da operação
    return { resultado, erro, operacao: opCode };
}

// Manipulador HTTP genérico para rotas de operações matemáticas via método POST
function handlerOperacao(req, res, operacaoForcada = null) {
    // Extrai os parâmetros recebidos na requisição HTTP
    let { oper1, oper2, operacao } = extrairParametros(req);

    // Se uma operação fixa foi informada pela rota (ex: /soma), utiliza ela
    if (operacaoForcada !== null) {
        operacao = operacaoForcada;
    }

    // Executa o cálculo aritmético com os parâmetros informados
    const { resultado, erro, operacao: opFinal } = executarCalculo(oper1, oper2, operacao);

    // Se ocorreu um erro durante a validação ou cálculo
    if (erro) {
        // Envia resposta HTTP de status 400 Bad Request com o detalhe do erro em formato JSON
        return res.status(400).json({
            // Mensagem de erro descritiva compatível com o retorno PHP
            erro: erro,
            // Campo de erro alternativo para ampla compatibilidade de clientes
            error: erro
        });
    }

    // Envia resposta HTTP de status 200 OK com os dados do cálculo e o resultado obtido
    return res.status(200).json({
        // Primeiro operando utilizado
        oper1: oper1,
        // Segundo operando utilizado
        oper2: oper2,
        // Código numérico da operação realizada
        operacao: opFinal,
        // Resultado numérico do cálculo (formato PHP)
        resultado: resultado,
        // Resultado numérico do cálculo (compatível com cliente Python do professor)
        result: resultado
    });
}

// ROTA 1: POST /operacao - Endpoint principal
app.post('/operacao', (req, res) => {
    // Delega o processamento da requisição ao handler genérico de operações
    handlerOperacao(req, res);
});

// ROTA 2: POST /soma - Endpoint REST dedicado à operação de soma via corpo JSON/Form
app.post('/soma', (req, res) => {
    // Invoca o handler forçando a operação de código 1 (soma)
    handlerOperacao(req, res, 1);
});

// ROTA 2.1: POST /soma/:param1/:param2 - Endpoint REST com parâmetros na URL (padrão Python do professor)
app.post('/soma/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 1 (soma) com os parâmetros da URL
    handlerOperacao(req, res, 1);
});

// ROTA 2.2: POST /operation/soma/:param1/:param2 - Endpoint REST com prefixo /operation (padrão exato da URL Python)
app.post('/operation/soma/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 1 (soma) com os parâmetros da URL
    handlerOperacao(req, res, 1);
});

// ROTA 3: POST /subtracao - Endpoint REST dedicado à operação de subtração via corpo JSON/Form
app.post('/subtracao', (req, res) => {
    // Invoca o handler forçando a operação de código 2 (subtração)
    handlerOperacao(req, res, 2);
});

// ROTA 3.1: POST /subtracao/:param1/:param2 - Endpoint REST de subtração com parâmetros na URL
app.post('/subtracao/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 2 (subtração)
    handlerOperacao(req, res, 2);
});

// ROTA 3.2: POST /operation/subtracao/:param1/:param2 - Endpoint REST de subtração com prefixo /operation
app.post('/operation/subtracao/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 2 (subtração)
    handlerOperacao(req, res, 2);
});

// ROTA 4: POST /multiplicacao - Endpoint REST dedicado à operação de multiplicação via corpo JSON/Form
app.post('/multiplicacao', (req, res) => {
    // Invoca o handler forçando a operação de código 3 (multiplicação)
    handlerOperacao(req, res, 3);
});

// ROTA 4.1: POST /multiplicacao/:param1/:param2 - Endpoint REST de multiplicação com parâmetros na URL
app.post('/multiplicacao/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 3 (multiplicação)
    handlerOperacao(req, res, 3);
});

// ROTA 4.2: POST /operation/multiplicacao/:param1/:param2 - Endpoint REST de multiplicação com prefixo /operation
app.post('/operation/multiplicacao/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 3 (multiplicação)
    handlerOperacao(req, res, 3);
});

// ROTA 5: POST /divisao - Endpoint REST dedicado à operação de divisão via corpo JSON/Form
app.post('/divisao', (req, res) => {
    // Invoca o handler forçando a operação de código 4 (divisão)
    handlerOperacao(req, res, 4);
});

// ROTA 5.1: POST /divisao/:param1/:param2 - Endpoint REST de divisão com parâmetros na URL
app.post('/divisao/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 4 (divisão)
    handlerOperacao(req, res, 4);
});

// ROTA 5.2: POST /operation/divisao/:param1/:param2 - Endpoint REST de divisão com prefixo /operation
app.post('/operation/divisao/:param1/:param2', (req, res) => {
    // Invoca o handler forçando a operação de código 4 (divisão)
    handlerOperacao(req, res, 4);
});

// ROTA 6: POST /expressao - Endpoint para a Abordagem 2 (Expressão avaliada inteiramente no servidor)
app.post('/expressao', (req, res) => {
    // Extrai o campo da expressão textual enviado no corpo da requisição
    const expressao = req.body.expressao || req.body.expression;

    // Valida se a expressão foi informada e se não está vazia
    if (!expressao || typeof expressao !== 'string' || expressao.trim() === '') {
        // Retorna erro 400 Bad Request se a expressão for nula ou inválida
        return res.status(400).json({
            // Mensagem descritiva de erro
            erro: "Expressão matemática não informada ou inválida. Envie o campo 'expressao' via POST.",
            // Campo de erro compatível
            error: "Expressão matemática não informada ou inválida. Envie o campo 'expressao' via POST."
        });
    }

    // Tenta avaliar a expressão matemática de forma segura com o parser
    try {
        // Invoca a função de avaliação segura da expressão
        const resultado = avaliarExpressao(expressao);

        // Retorna status 200 OK com a expressão original e o resultado computado
        return res.status(200).json({
            // Expressão matemática processada
            expressao: expressao,
            // Resultado numérico final do cálculo
            resultado: resultado,
            // Campo result para compatibilidade
            result: resultado
        });
    } catch (err) {
        // Captura exceções de sintaxe ou divisão por zero geradas pelo parser
        return res.status(400).json({
            // Mensagem com o detalhe do erro capturado
            erro: err.message,
            // Campo de erro alternativo
            error: err.message
        });
    }
});

// Inicia o servidor HTTP escutando na porta configurada
const server = app.listen(PORT, () => {
    // Exibe banner informativo no terminal indicando inicialização bem-sucedida
    console.log(`=======================================================`);
    // Exibe a URL base onde o servidor está operando
    console.log(` Servidor Calculadora REST rodando em: http://localhost:${PORT}`);
    // Exibe link da interface web visual
    console.log(` Interface Web Visual disponível em: http://localhost:${PORT}`);
    // Exibe instruções dos endpoints disponíveis
    console.log(` Endpoints disponíveis: POST /operacao, POST /expressao, etc.`);
    // Exibe linha de encerramento do banner
    console.log(`=======================================================`);
});

// Exporta o aplicativo Express e a instância do servidor para permitir testes automatizados
module.exports = { app, server };
