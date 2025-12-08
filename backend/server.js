// backend/server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
// Limite aumentado para aceitar fotos grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Conexão com Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ========================================================
// 🔐 CREDENCIAIS
// ========================================================
const CREDENCIAIS_FIXAS = {
    "11122233344": { senha: "123456", nome: "Administrador Master", perfil: "admin" },
    "33344455566": { senha: "123456", nome: "Colaborador de Teste", perfil: "user" }
};

// ========================================================
// 🛠️ FUNÇÃO DE LIMPEZA DE TEXTO (VERSÃO DEFINITIVA V6)
// ========================================================
function corrigirStringQuebrada(texto) {
    if (typeof texto !== 'string' || !texto) return texto;
    
    // 1. CORREÇÕES CIRÚRGICAS (PRIORIDADE MÁXIMA)
    // Resolve especificamente os erros relatados ignorando regras genéricas
    if (texto.includes('H UMA')) texto = texto.replace(/H UMA/g, 'HÁ UMA');
    
    // Resolve qualquer variação de "Analista Opera??es" ou "Analista Operaes"
    // O regex pega "Analista Opera" + qualquer lixo + "es"
    texto = texto.replace(/Analista Opera.{1,5}es/gi, 'Analista Operações');

    // 2. Correções Espaciais e de Caracteres Estranhos
    if (texto.includes(' S ')) texto = texto.replace(/ S /g, ' ÀS ');
    
    // Remove caractere de substituição unicode () explicitamente
    texto = texto.replace(/\uFFFD/g, ''); 

    // 3. Dicionário de Correções Gerais
    const CORRECOES_COMUNS = [
        // CORREÇÃO DO "H" ISOLADO (Verbo Haver em outros contextos)
        // \b garante que é o H sozinho. Ex: "H de horas" não muda, mas "H duvidas" vira "HÁ duvidas"
        { erro: /\bH\b/g, correto: 'HÁ' },

        // CORREÇÃO DO PDI (Contexto de frase)
        { erro: /SEGURAN.A E PRECISO/g, correto: 'SEGURANÇA E PRECISÃO' },
        { erro: /COM MAIS SEGURAN.A/g, correto: 'COM MAIS SEGURANÇA' },
        { erro: / E PRECISO\./g, correto: ' E PRECISÃO.' },

        // CORREÇÃO GENÉRICA PARA "OPERAÇÕES" (Caso não tenha sido pego no cirúrgico)
        { erro: /Opera[^ ]{1,4}es/gi, correto: 'Operações' },
        { erro: /OPERA[^ ]{1,4}ES/g, correto: 'OPERAÇÕES' },
        
        // --- CORREÇÕES DE PALAVRAS QUEBRADAS ---
        { erro: /LIDERANA/g, correto: 'LIDERANÇA' },
        { erro: /LIDERANCA/g, correto: 'LIDERANÇA' },
        { erro: /CONVERSAO/g, correto: 'CONVERSAÇÃO' },
        { erro: /COMUNICAO/g, correto: 'COMUNICAÇÃO' },
        { erro: /COMUNICACAO/g, correto: 'COMUNICAÇÃO' },
        { erro: /INTERAES/g, correto: 'INTERAÇÕES' },
        { erro: /INTERACOES/g, correto: 'INTERAÇÕES' },
        { erro: /INTERAO/g, correto: 'INTERAÇÃO' },
        { erro: /INTERACAO/g, correto: 'INTERAÇÃO' },
        { erro: /PBLICO/g, correto: 'PÚBLICO' },
        { erro: /SEGURANA/g, correto: 'SEGURANÇA' },
        { erro: /SEGURANCA/g, correto: 'SEGURANÇA' },
        { erro: /CONFIANA/g, correto: 'CONFIANÇA' },
        { erro: /CONFIANCA/g, correto: 'CONFIANÇA' },
        { erro: /EXPRESSO/g, correto: 'EXPRESSÃO' },
        { erro: /PRIORIZAO/g, correto: 'PRIORIZAÇÃO' },
        { erro: /REUNIES/g, correto: 'REUNIÕES' },
        { erro: /DECISES/g, correto: 'DECISÕES' },
        { erro: /SITUAO/g, correto: 'SITUAÇÃO' },
        { erro: /SITUACAO/g, correto: 'SITUAÇÃO' },
        { erro: /NAO/g, correto: 'NÃO' }
    ];

    CORRECOES_COMUNS.forEach(item => {
        texto = texto.replace(item.erro, item.correto);
    });

    // 4. Correções antigas de interrogação '?' (Backup final)
    if (texto.match(/[\?]/)) {
        const correcoesAntigas = {
            'COMPET.NCIAS': 'COMPETÊNCIAS', 'SEGURAN.A': 'SEGURANÇA',
            'CONFIAN.A': 'CONFIANÇA', 'AN.LISE': 'ANÁLISE',
            'ANAL.TICA': 'ANALÍTICA', 'DECIS.ES': 'DECISÕES',
            'PRIORIZA..O': 'PRIORIZAÇÃO', 'REUNI.ES': 'REUNIÕES',
            'COMUNICA..O': 'COMUNICAÇÃO', 'OPERA..ES': 'OPERAÇÕES',
            'Opera..es': 'Operações'
        };
        for (const [erro, correto] of Object.entries(correcoesAntigas)) {
            const regex = new RegExp(erro, 'g');
            if (texto.match(regex)) texto = texto.replace(regex, correto);
        }
        texto = texto.replace(/(\d)\./g, '$1°');
    }

    return texto;
}

// ========================================================
// 🚀 ROTAS DA API
// ========================================================

// 1. Login
app.post('/api/login', async (req, res) => {
    try {
        const { cpf, senha } = req.body;
        const cpfLimpo = cpf.replace(/\D/g, ''); 

        // A. Login Fixo
        const userFixo = CREDENCIAIS_FIXAS[cpfLimpo];
        if (userFixo && userFixo.senha === senha) {
            return res.json({ sucesso: true, usuario: { nome: userFixo.nome, perfil: userFixo.perfil, cpf: cpfLimpo } });
        }

        // B. Login Banco
        if (senha === "123456") {
            const { data } = await supabase.from('QLP').select('NOME, CPF').eq('CPF', cpfLimpo).maybeSingle();
            if (data) {
                return res.json({ 
                    sucesso: true, 
                    usuario: { nome: corrigirStringQuebrada(data.NOME), perfil: 'user', cpf: cpfLimpo }
                });
            }
        }
        res.status(401).json({ sucesso: false, mensagem: "CPF ou senha incorretos." });
    } catch (error) {
        res.status(500).json({ error: "Erro interno" });
    }
});

// 2. Colaboradores
app.get('/api/colaboradores', async (req, res) => {
    try {
        const { search, status, area, lider, classificacao, cpf_filtro, page = 0 } = req.query;
        const ITENS = 30;
        const from = page * ITENS;
        const to = from + ITENS - 1;

        let query = supabase.from('QLP').select('*', { count: 'exact' });

        if (cpf_filtro) {
            query = query.eq('CPF', cpf_filtro);
        } else {
            if (search) query = query.ilike('NOME', `%${search}%`);
            if (status) query = (status === 'AFASTADO') ? query.or('SITUACAO.eq.AFASTADO,SITUACAO.eq.AFASTAMENTO') : (status === 'DESLIGADOS' ? query.or('SITUACAO.eq.DESLIGADOS,SITUACAO.eq.DESPEDIDA') : query.eq('SITUACAO', status));
            if (area) query = query.eq('ATIVIDADE', area);
            if (lider) query = query.eq('LIDER', lider);
            if (classificacao) query = query.eq('CLASSIFICACAO', classificacao);
        }

        query = query.order('NOME', { ascending: true }).range(from, to);
        const { data, count } = await query;

        const dadosLimpos = (data || []).map(c => {
            const obj = { ...c };
            
            // 1. Limpa campos principais (INCLUINDO CARGO_ANTIGO e CARGO ATUAL)
            ['NOME', 'ATIVIDADE', 'LIDER', 'TURNO', 'ESCOLARIDADE', 'CARGO ATUAL', 'CARGO_ANTIGO'].forEach(k => { 
                if (obj[k]) obj[k] = corrigirStringQuebrada(obj[k]); 
            });

            // 2. Limpa TODOS os campos do Ciclo de Gente (PDI)
            for(let i=1; i<=7; i++) {
                [
                    `COMPETENCIA_${i}`, 
                    `SITUACAO_DA_ACAO_${i}`, 
                    `O_QUE_FAZER_${i}`, 
                    `POR_QUE_FAZER_${i}`,      // Motivo
                    `QUE_PODE_ME_AJUDAR_${i}`, // Apoio
                    `COMO_VOU_FAZER_${i}`      // Método
                ].forEach(k => { 
                    if (obj[k]) obj[k] = corrigirStringQuebrada(obj[k]); 
                });
            }
            return obj;
        });

        res.json({ data: dadosLimpos, count });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Filtros
app.get('/api/filtros', async (req, res) => {
    try {
        const { data } = await supabase.from('QLP').select('ATIVIDADE, LIDER, CLASSIFICACAO');
        const safeData = data || [];
        const areas = [...new Set(safeData.map(d => corrigirStringQuebrada(d.ATIVIDADE)).filter(Boolean))].sort();
        const lideres = [...new Set(safeData.map(d => corrigirStringQuebrada(d.LIDER)).filter(Boolean))].sort();
        const classificacoes = [...new Set(safeData.map(d => d.CLASSIFICACAO).filter(Boolean))].sort();
        res.json({ areas, lideres, classificacoes });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Dashboard Stats
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const { data: metasData, error: errorMetas } = await supabase.from('metas_qlp').select('*');
        const { data: ativosData, error: errorAtivos } = await supabase.from('QLP').select('ATIVIDADE, SITUACAO, PCD, "CARGO ATUAL"').eq('SITUACAO', 'ATIVO');
        
        if (errorMetas) console.error("Erro ao buscar metas:", errorMetas);
        if (errorAtivos) console.error("Erro ao buscar ativos:", errorAtivos);

        const metas = metasData || [];
        const ativos = ativosData || [];
        
        const metasMap = metas.reduce((acc, m) => ({...acc, [m.area]: m}), {});
        const areas = [...new Set([...ativos.map(d => corrigirStringQuebrada(d.ATIVIDADE)).filter(Boolean), ...Object.keys(metasMap)])].sort();
        
        const stats = {};
        areas.forEach(a => stats[a] = { qlp: 0, pcd: 0, jovem: 0, meta: metasMap[a] || {} });

        ativos.forEach(c => {
            const area = corrigirStringQuebrada(c.ATIVIDADE);
            if (stats[area]) {
                stats[area].qlp++;
                if (c.PCD === 'SIM') stats[area].pcd++;
                if ((c['CARGO ATUAL']||'').includes('JOVEM APRENDIZ')) stats[area].jovem++;
            }
        });
        
        res.json({ stats, totalAtivos: ativos.length, areas });
    } catch (err) {
        console.error("Erro rota dashboard-stats:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Salvar Metas
app.post('/api/metas', async (req, res) => {
    try {
        const { area, meta, meta_pcd, meta_jovem } = req.body;
        const { error } = await supabase.from('metas_qlp').upsert({ area, meta, meta_pcd, meta_jovem }, { onConflict: 'area' });
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Upload Foto
app.post('/api/upload-foto', async (req, res) => {
    try {
        const { cpf, imagemBase64 } = req.body;
        const cpfLimpo = cpf.replace(/\D/g, '');

        if (!cpfLimpo || !imagemBase64) return res.status(400).json({ error: "Dados incompletos" });

        const { error } = await supabase
            .from('QLP')
            .update({ 'FOTO_PERFIL': imagemBase64 })
            .eq('CPF', cpfLimpo);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error("Erro upload foto:", err);
        res.status(500).json({ error: "Erro ao salvar foto" });
    }
});

app.listen(port, () => {
    console.log(`✅ Servidor rodando na porta ${port}`);
});