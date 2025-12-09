/**
 * Utils.js - Utilitários para normalização e limpeza de dados
 * Fornece funções robustas para corrigir caracteres acentuados e especiais em português
 */

/**
 * Normaliza strings com problemas de encoding de acentos
 * Converte caracteres corrompidos para suas versões corretas em português
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} Texto normalizado
 */
function normalizarTexto(texto) {
    if (typeof texto !== 'string' || !texto) return texto;

    // 1. Remover caracteres inválidos/corruptos
    texto = texto.replace(/\uFFFD/g, '');
    
    // 2. Dicionário completo de correções comuns (maiúsculas)
    const correcoesAcentos = {
        // Letras com til - Negação
        'NAO': 'NÃO',
        'NOES': 'NÕES',
        'NAE': 'NÃE',
        'MUITISSIMO': 'MUITÍSSIMO',
        'OTIMO': 'ÓTIMO',
        'ACAO': 'AÇÃO',
        'ACOES': 'AÇÕES',
        'ALEM': 'ALÉM',
        'SAUCAO': 'SAUÇÃO',
        'SITUACAO': 'SITUAÇÃO',
        'SITUACOES': 'SITUAÇÕES',
        'SITUAES': 'SITUAÇÕES',
        'EXCECAO': 'EXCEÇÃO',
        'EXCECOES': 'EXCEÇÕES',
        'PRESERVACAO': 'PRESERVAÇÃO',
        'OBTENCAO': 'OBTENÇÃO',
        'ATENCAO': 'ATENÇÃO',
        'INTENCAO': 'INTENÇÃO',
        'PENSAO': 'PENSÃO',
        'REMUNERACAO': 'REMUNERAÇÃO',
        'REMUNERACOES': 'REMUNERAÇÕES',
        'RETENCAO': 'RETENÇÃO',
        'CONVENCAO': 'CONVENÇÃO',
        'DIMENSAO': 'DIMENSÃO',
        'DIMENSOES': 'DIMENSÕES',
        'EXTENSAO': 'EXTENSÃO',
        'RETOMACAO': 'RETOMAÇÃO',
        'TAMBM': 'TAMBÉM',
        'TAMBEM': 'TAMBÉM',
        'VISO': 'VISÃO',
        'VISAO': 'VISÃO',
        'VISOES': 'VISÕES',
        'JA': 'JÁ',
        'J': 'JÁ',
        'S': 'ÁS',
        
        // Letras com acento agudo (E = É)
        'ANALISE': 'ANÁLISE',
        'ANLISE': 'ANÁLISE',
        'ANALITICA': 'ANALÍTICA',
        'ANALITICO': 'ANALÍTICO',
        'COMPETENCIA': 'COMPETÊNCIA',
        'COMPETENCIAS': 'COMPETÊNCIAS',
        'COMPETNCIAS': 'COMPETÊNCIAS',
        'BSICA': 'BÁSICA',
        'BASICA': 'BÁSICA',
        'BASICO': 'BÁSICO',
        'BASICOS': 'BÁSICOS',
        'BASICAS': 'BÁSICAS',
        'LOGISTICA': 'LOGÍSTICA',
        'LOGISTICO': 'LOGÍSTICO',
        'LOGISTICAS': 'LOGÍSTICAS',
        'LOGISTICOS': 'LOGÍSTICOS',
        'METRICA': 'MÉTRICA',
        'METRICAS': 'MÉTRICAS',
        'CRITICA': 'CRÍTICA',
        'CRITICAS': 'CRÍTICAS',
        'CRTICAS': 'CRÍTICAS',
        'CRITICO': 'CRÍTICO',
        'CRITICOS': 'CRÍTICOS',
        'MODULO': 'MÓDULO',
        'MODULOS': 'MÓDULOS',
        'FORMULA': 'FÓRMULA',
        'FORMULAS': 'FÓRMULAS',
        'AREA': 'ÁREA',
        'AREAS': 'ÁREAS',
        'ESPECIFICO': 'ESPECÍFICO',
        'ESPECIFICOS': 'ESPECÍFICOS',
        'ESPECIFICA': 'ESPECÍFICA',
        'ESPECIFICAS': 'ESPECÍFICAS',
        'EMPATICA': 'EMPÁTICA',
        'EMPATICO': 'EMPÁTICO',
        'EMPATICAS': 'EMPÁTICAS',
        'EMPATICOS': 'EMPÁTICOS',
        'EMPTICA': 'EMPÁTICA',
        'EMPTICOS': 'EMPÁTICOS',
        'EMPTICAS': 'EMPÁTICAS',
        'HIERARQUIA': 'HIERARQUIA',
        'HIERARCHIA': 'HIERARQUIA',
        'HELIANDRO': 'HELIANDRO',
        'ELIANDRO': 'ELIANDRO',
        'GESTO': 'GESTÃO',
        'GESTOS': 'GESTÕES',
        'DISTRIBUICAO': 'DISTRIBUIÇÃO',
        'DISTRIBUICOES': 'DISTRIBUIÇÕES',
        'DISTRIBUIO': 'DISTRIBUIÇÃO',
        'COMEAR': 'COMEÇAR',
        'COMECA': 'COMEÇA',
        'COMECAM': 'COMEÇAM',
        'COMECANDO': 'COMEÇANDO',
        'COMECOU': 'COMEÇOU',
        'COMECADA': 'COMEÇADA',
        'COMECADO': 'COMEÇADO',
        'COMECADAS': 'COMEÇADAS',
        'COMECADOS': 'COMEÇADOS',
        'COMECARA': 'COMEÇARÁ',
        'COMECARAO': 'COMEÇARÃO',
        'COMECARIA': 'COMEÇARIA',
        'COMECO': 'COMEÇO',
        'COMECOS': 'COMEÇOS',
        'EXPERIENCIA': 'EXPERIÊNCIA',
        'EXPERIENCIAS': 'EXPERIÊNCIAS',
        'EXISTENCIA': 'EXISTÊNCIA',
        'PRESENCIA': 'PRESENÇA',
        'AUSENCIA': 'AUSÊNCIA',
        'SEQUENCIA': 'SEQUÊNCIA',
        'FREQUENCIA': 'FREQUÊNCIA',
        'TENDENCIA': 'TENDÊNCIA',
        'AGENCIA': 'AGÊNCIA',
        'REGENCIA': 'REGÊNCIA',
        'DECENCIA': 'DECÊNCIA',
        'VIOLENCIA': 'VIOLÊNCIA',
        'PACIENCIA': 'PACIÊNCIA',
        'IMPACIENCIA': 'IMPACIÊNCIA',
        'INTELIGENCIA': 'INTELIGÊNCIA',
        
        // Letras com grave
        'VEZ': 'VÊZ',
        
        // Letra com circunflexo
        'EXEMPLO': 'EXEMPLO',
        'OBRIGADO': 'OBRIGADO',
        
        // Letras com cedilha
        'FUNCAO': 'FUNÇÃO',
        'FUNCOES': 'FUNÇÕES',
        'NEGOCIACAO': 'NEGOCIAÇÃO',
        'CONCEITUAL': 'CONCEITUAL',
        'CONFIANCA': 'CONFIANÇA',
        'CONFIANCAS': 'CONFIANCAS',
        'ATUACAO': 'ATUAÇÃO',
        
        // Letras com acento agudo (e)
        'COMPETENCIA': 'COMPETÊNCIA',
        'COMPETENCIAS': 'COMPETÊNCIAS',
        'EXPERIENCIA': 'EXPERIÊNCIA',
        'EXPERIENCIAS': 'EXPERIÊNCIAS',
        'EXISTENCIA': 'EXISTÊNCIA',
        'PRESENCIA': 'PRESENÇA',
        'AUSENCIA': 'AUSÊNCIA',
        'SEQUENCIA': 'SEQUÊNCIA',
        'FREQUENCIA': 'FREQUÊNCIA',
        'TENDENCIA': 'TENDÊNCIA',
        'AGENCIA': 'AGÊNCIA',
        'REGENCIA': 'REGÊNCIA',
        'DECENCIA': 'DECÊNCIA',
        'VIOLENCIA': 'VIOLÊNCIA',
        'PACIENCIA': 'PACIÊNCIA',
        'IMPACIENCIA': 'IMPACIÊNCIA',
        'INTELIGENCIA': 'INTELIGÊNCIA',
        
        // Operações
        'OPERACAO': 'OPERAÇÃO',
        'OPERACOES': 'OPERAÇÕES',
        'OPERACAES': 'OPERAÇÕES',
        
        // Comunicação
        'COMUNICACAO': 'COMUNICAÇÃO',
        'COMUNICACOES': 'COMUNICAÇÕES',
        'CONVERSACAO': 'CONVERSAÇÃO',
        'CONVERSACOES': 'CONVERSAÇÕES',
        
        // Liderança
        'LIDERANCA': 'LIDERANÇA',
        'LIDERACAS': 'LIDERANÇAS',
        'LIDERANACAS': 'LIDERANÇAS',
        'LIDERCA': 'LIDERANÇA',
        
        // Interação
        'INTERACAO': 'INTERAÇÃO',
        'INTERACOES': 'INTERAÇÕES',
        'INTERCA': 'INTERAÇÃO',
        'INTERACAS': 'INTERAÇÕES',
        
        // Decisão
        'DECISAO': 'DECISÃO',
        'DECISOES': 'DECISÕES',
        'DECISO': 'DECISÃO',
        'DECIOES': 'DECISÕES',
        
        // Priorização
        'PRIORIZACAO': 'PRIORIZAÇÃO',
        'PRIORIZAR': 'PRIORIZAR',
        'PRIORIZA': 'PRIORIZA',
        'PRIOZACAO': 'PRIORIZAÇÃO',
        
        // Reunião
        'REUNIAO': 'REUNIÃO',
        'REUNIOES': 'REUNIÕES',
        'REUNIE': 'REUNIÃO',
        'REUNIES': 'REUNIÕES',
        
        // Segurança
        'SEGURANCA': 'SEGURANÇA',
        'SEGURANCAS': 'SEGURANCAS',
        'SEGURAN': 'SEGURANÇA',
        
        // Público
        'PUBLICO': 'PÚBLICO',
        'PUBLICA': 'PÚBLICA',
        'PUBLICOS': 'PÚBLICOS',
        'PUBLICAS': 'PÚBLICAS',
        
        // Expressão
        'EXPRESSO': 'EXPRESSÃO',
        'EXPRESSOES': 'EXPRESSÕES',
        'EXPRESAO': 'EXPRESSÃO',
        'EXPRESSAO': 'EXPRESSÃO',
        
        // Verificação
        'VERIFICACAO': 'VERIFICAÇÃO',
        'VERIFICACOES': 'VERIFICAÇÕES',
        'VERIFICAO': 'VERIFICAÇÃO',
        
        // Influência
        'INFLUENCIA': 'INFLUÊNCIA',
        'INFLUENCIAS': 'INFLUÊNCIAS',
        'INFLUENCA': 'INFLUÊNCIA',
        'INFLUENCAS': 'INFLUÊNCIAS',
        
        // Competência
        'COMPETENCIA': 'COMPETÊNCIA',
        'COMPETENCIAS': 'COMPETÊNCIAS',
        
        // Experiência
        'EXPERIENCIA': 'EXPERIÊNCIA',
        'EXPERIENCIAS': 'EXPERIÊNCIAS',
        
        // Confiança
        'CONFIANCA': 'CONFIANÇA',
        'CONFIANA': 'CONFIANÇA',
        
        // Antecipação
        'ANTECIPACAO': 'ANTECIPAÇÃO',
        'ANTECIPACOES': 'ANTECIPAÇÕES',
        
        // Dificuldade
        'DIFICULDADE': 'DIFICULDADE',
        'DIFICULDADES': 'DIFICULDADES',
        
        // Capacidade
        'CAPACIDADE': 'CAPACIDADE',
        'CAPACIDADES': 'CAPACIDADES',
        
        // Responsabilidade
        'RESPONSABILIDADE': 'RESPONSABILIDADE',
        'RESPONSABILIDADES': 'RESPONSABILIDADES',
        
        // Estratégia
        'ESTRATEGIA': 'ESTRATÉGIA',
        'ESTRATEGIAS': 'ESTRATÉGIAS',
        'ESTRATEGICA': 'ESTRATÉGICA',
        'ESTRATEGICAS': 'ESTRATÉGICAS',
        'ESTRATEGICO': 'ESTRATÉGICO',
        'ESTRATEGICOS': 'ESTRATÉGICOS',
        
        // Entrega
        'ENTREGA': 'ENTREGA',
        'ENTREGAS': 'ENTREGAS',
        
        // Risco
        'RISCO': 'RISCO',
        'RISCOS': 'RISCOS',
        
        // Reativo
        'REATIVO': 'REATIVO',
        'REATIVOS': 'REATIVOS',
        'REATIVA': 'REATIVA',
        'REATIVAS': 'REATIVAS',
        
        // Proativo
        'PROATIVO': 'PROATIVO',
        'PROATIVOS': 'PROATIVOS',
        'PROATIVA': 'PROATIVA',
        'PROATIVAS': 'PROATIVAS',
        
        // Mentor
        'MENTOR': 'MENTOR',
        'MENTORES': 'MENTORES',
        'MENTORIA': 'MENTORIA',
        'MENTORIAS': 'MENTORIAS',
    };

    // Aplicar correções maiúsculas
    for (const [erro, correto] of Object.entries(correcoesAcentos)) {
        const regex = new RegExp(`\\b${erro}\\b`, 'g');
        texto = texto.replace(regex, correto);
    }

    // 3. Correções específicas de padrões quebrados (com pontos ou caracteres estranhos)
    // APENAS padrões muito específicos - sem regras genéricas que causem problemas
    const correcoesEspeciais = [
        { padrao: /SEGURAN\.A/g, correto: 'SEGURANÇA' },
        { padrao: /seguran\.a/g, correto: 'segurança' },
        { padrao: /CONFIAN\.A/g, correto: 'CONFIANÇA' },
        { padrao: /confian\.a/g, correto: 'confiança' },
        { padrao: /AN\.LISE/g, correto: 'ANÁLISE' },
        { padrao: /an\.lise/g, correto: 'análise' },
        { padrao: /ANAL\.TICA/g, correto: 'ANALÍTICA' },
        { padrao: /anal\.tica/g, correto: 'analítica' },
        { padrao: /DECIS\.ES/g, correto: 'DECISÕES' },
        { padrao: /decis\.es/g, correto: 'decisões' },
        { padrao: /REUNI\.ES/g, correto: 'REUNIÕES' },
        { padrao: /reuni\.es/g, correto: 'reuniões' },
        { padrao: /OPERA\.\.ES/g, correto: 'OPERAÇÕES' },
        { padrao: /opera\.\.es/g, correto: 'operações' },
        { padrao: /COMUNICA\.\.O/g, correto: 'COMUNICAÇÃO' },
        { padrao: /comunica\.\.o/g, correto: 'comunicação' },
    ];

    correcoesEspeciais.forEach(item => {
        texto = texto.replace(item.padrao, item.correto);
    });

    return texto;
}

/**
 * Normaliza um objeto inteiro recursivamente
 * @param {Object} obj - Objeto a ser normalizado
 * @returns {Object} Objeto normalizado
 */
function normalizarObjeto(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => normalizarObjeto(item));
    }
    
    if (obj !== null && typeof obj === 'object') {
        const novoObj = {};
        for (const [chave, valor] of Object.entries(obj)) {
            if (typeof valor === 'string') {
                novoObj[chave] = normalizarTexto(valor);
            } else {
                novoObj[chave] = normalizarObjeto(valor);
            }
        }
        return novoObj;
    }
    
    if (typeof obj === 'string') {
        return normalizarTexto(obj);
    }
    
    return obj;
}

/**
 * Normaliza dados recebidos da API antes de exibir
 * @param {any} dados - Dados da API
 * @returns {any} Dados normalizados
 */
function normalizarDadosAPI(dados) {
    return normalizarObjeto(dados);
}

/**
 * Exporta as funções para uso em outros módulos
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        normalizarTexto,
        normalizarObjeto,
        normalizarDadosAPI
    };
}
