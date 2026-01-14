const API_URL = 'https://backend-g-rh.onrender.com';

// Variáveis Globais
let dashboardContainer, loadingIndicator, searchBar, filterStatus, filterArea, filterLider, filterClassificacao, filterPCD, btnExportarGeral, loadMoreButton;
let metaForm, metaAreaSelect, metaValorInput, metaPCDInput, metaJovemInput, metaSubmitButton, metaSuccessMessage;
let reportTableBodyQLP, reportTableBodyPCD, reportTableBodyJovem;
let metaChartQLP = null, metaChartPCD = null, metaChartJovem = null;
let currentPage = 0;
let listaColaboradoresGlobal = []; 
let cacheFerias = [];

// ==========================================
// 🔐 RECUPERA DADOS DA SESSÃO SEGURA (COOKIE)
// ==========================================
const usuarioLogado = Sessao.ler();

if (!usuarioLogado) {
    window.location.href = 'login.html';
}

// ==========================================
// 🚫 BLOQUEIO DE ACESSO PRELIMINAR
// ==========================================
const _situacaoUsuario = (usuarioLogado.SITUACAO || usuarioLogado.situacao || '').toUpperCase();
const _classificacaoUsuario = (usuarioLogado.CLASSIFICACAO || usuarioLogado.classificacao || '').toUpperCase();

if (_situacaoUsuario.includes('DESLIGADO') || _classificacaoUsuario === 'DESLIGAR') {
    alert('Acesso não permitido.\nMotivo: Vínculo encerrado ou em processo de desligamento.');
    Sessao.limpar();
    throw new Error("Acesso negado: Usuário desligado.");
}
// ==========================================

const usuarioPerfil = usuarioLogado.perfil; // 'admin' ou 'user'
const usuarioCPF = usuarioLogado.cpf;
const usuarioNome = usuarioLogado.nome;

// ======== FUNÇÕES DE AJUDA ========

function normalizarStatusPCD(valor) {
    if (valor === null || valor === undefined) return 'NÃO';
    if (valor === true) return 'SIM';
    if (valor === false) return 'NÃO';
    const s = String(valor).toUpperCase().trim();
    const positivos = ['SIM', 'S', 'YES', 'Y', 'TRUE', '1', 'VERDADEIRO'];
    if (positivos.includes(s)) return 'SIM';
    return 'NÃO';
}

function formatarSalario(valor) {
    if (!valor) return '';
    const numeroLimpo = String(valor).replace("R$", "").replace(/\./g, "").replace(",", ".");
    const numero = parseFloat(numeroLimpo);
    if (isNaN(numero)) return valor;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero);
}

function formatarCPF(cpf) {
    if (!cpf) return '';
    let c = String(cpf).replace(/[^\d]/g, '');
    if (c.length === 10) c = '0' + c;
    if (c.length !== 11) return cpf;
    return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9, 11)}`;
}

function formatarDataExcel(valor) {
    if (!valor) return '';
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
            const parteData = valor.split('T')[0];
            const [ano, mes, dia] = parteData.split('-');
            return `${dia}/${mes}/${ano}`;
        } catch (e) { return valor; }
    }
    const serial = Number(valor);
    if (isNaN(serial) || serial < 20000) return String(valor);
    try {
        const d = new Date((serial - 25569) * 86400000);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return d.toLocaleDateString('pt-BR');
    } catch (e) { return String(valor); }
}

function formatarTempoDeEmpresa(dias) {
    const n = parseInt(dias, 10);
    if (isNaN(n) || n <= 0) return 'Recente'; 
    if (n > 20000) {
        const hoje = new Date();
        const dataAdmissao = new Date((n - 25569) * 86400000);
        const diffTime = Math.abs(hoje - dataAdmissao);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return formatarTempoDeEmpresa(diffDays);
    }
    const anos = Math.floor(n / 365);
    const diasRestantes = n % 365;
    const meses = Math.floor(diasRestantes / 30);
    let res = [];
    if (anos > 0) res.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`);
    if (meses > 0) res.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`);
    if (res.length === 0) return "Menos de 1 mês";
    return res.join(' e ');
}

// ======== SETUP DO DASHBOARD ========
function setupDashboard() {
    dashboardContainer = document.getElementById('dashboard-container');
    loadingIndicator = document.getElementById('loading-indicator');
    
    searchBar = document.getElementById('search-bar');
    filterStatus = document.getElementById('filter-status');
    filterArea = document.getElementById('filter-area');
    filterLider = document.getElementById('filter-lider');
    filterClassificacao = document.getElementById('filter-classificacao');
    filterPCD = document.getElementById('filter-pcd');
    btnExportarGeral = document.getElementById('btn-exportar-geral');
    loadMoreButton = document.getElementById('load-more-button');
    
    metaForm = document.getElementById('meta-form');
    metaAreaSelect = document.getElementById('meta-area');
    metaValorInput = document.getElementById('meta-valor');
    metaPCDInput = document.getElementById('meta-pcd-valor'); 
    metaJovemInput = document.getElementById('meta-jovem-valor'); 
    metaSubmitButton = document.getElementById('meta-submit-button');
    metaSuccessMessage = document.getElementById('meta-success-message');
    
    reportTableBodyQLP = document.getElementById('report-table-body-qlp');
    reportTableBodyPCD = document.getElementById('report-table-body-pcd');
    reportTableBodyJovem = document.getElementById('report-table-body-jovem');

    setupMobileMenu();

    if (usuarioPerfil === 'user') {
        const filterContainer = document.querySelector('.filter-container');
        if (filterContainer) filterContainer.style.display = 'none';
        
        const navGestao = document.getElementById('nav-painel-gestao');
        const navGraficos = document.getElementById('nav-graficos');
        if (navGestao) navGestao.style.display = 'none';
        if (navGraficos) navGraficos.style.display = 'none';
    }

    let timeout = null;
    if (searchBar) searchBar.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(carregarColaboradores, 500);
    });

    if (filterStatus) filterStatus.addEventListener('change', carregarColaboradores);
    if (filterArea) filterArea.addEventListener('change', carregarColaboradores);
    if (filterLider) filterLider.addEventListener('change', carregarColaboradores);
    if (filterClassificacao) filterClassificacao.addEventListener('change', carregarColaboradores);
    if (filterPCD) filterPCD.addEventListener('change', carregarColaboradores);
    
    if (btnExportarGeral) btnExportarGeral.addEventListener('click', exportarRelatorioGeral);
    if (loadMoreButton) loadMoreButton.addEventListener('click', carregarMais);
    
    if (metaForm) metaForm.addEventListener('submit', handleMetaSubmit);
    
    setupNavigation();
    carregarFiltrosAPI(); 
    restaurarAbaAtiva();
}

function setupMobileMenu() {
    const btnMenu = document.getElementById('btn-menu-burger');
    const btnClose = document.getElementById('btn-close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu() { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); }
    function closeMenu() { sidebar.classList.remove('active'); overlay.classList.remove('active'); }

    if (btnMenu) btnMenu.addEventListener('click', toggleMenu);
    if (btnClose) btnClose.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    const links = document.querySelectorAll('.nav-link');
    links.forEach(l => l.addEventListener('click', () => { if(window.innerWidth <= 768) closeMenu(); }));
}

function setupNavigation() {
    const navs = {
        'visao-geral': document.getElementById('nav-visao-geral'),
        'gestao': document.getElementById('nav-painel-gestao'),
        'graficos': document.getElementById('nav-graficos'),
        'ferias': document.getElementById('nav-ferias')
    };
    Object.keys(navs).forEach(key => {
        if(navs[key]) navs[key].addEventListener('click', (e) => {
            e.preventDefault();
            if (usuarioPerfil === 'user' && (key === 'gestao' || key === 'graficos')) {
                alert('Acesso restrito a administradores.');
                return;
            }
            trocarAba(key);
        });
    });
    const navSair = document.getElementById('nav-sair');
    if (navSair) navSair.addEventListener('click', (e) => { e.preventDefault(); Sessao.limpar(); });
}

function trocarAba(aba) {
    const contents = {
        'visao-geral': document.getElementById('visao-geral-content'),
        'gestao': document.getElementById('gestao-content'),
        'graficos': document.getElementById('graficos-content'),
        'ferias': document.getElementById('ferias-content')
    };
    for (let key in contents) {
        if (contents[key]) contents[key].style.display = (key === aba) ? 'block' : 'none';
        const nav = document.getElementById(`nav-${key === 'gestao' ? 'painel-gestao' : key}`);
        if(nav) {
            if (key === aba) nav.classList.add('active');
            else nav.classList.remove('active');
        }
    }
    sessionStorage.setItem('activeTab', aba);
    if (usuarioPerfil === 'admin') {
        if (aba === 'gestao') carregarDadosDashboard(); 
        if (aba === 'graficos') carregarDadosDashboard(true);
    }
    if (aba === 'ferias') carregarDadosFerias();
}

function restaurarAbaAtiva() {
    let activeTab = sessionStorage.getItem('activeTab') || 'visao-geral';
    if (usuarioPerfil === 'user' && (activeTab === 'gestao' || activeTab === 'graficos')) activeTab = 'visao-geral';
    trocarAba(activeTab);
    if(activeTab === 'visao-geral') carregarColaboradores();
}

async function carregarFiltrosAPI() {
    if (usuarioPerfil === 'user') return;
    try {
        const res = await fetch(`${API_URL}/filtros`);
        let { areas, lideres, classificacoes } = await res.json();
        areas = areas.map(i => normalizarTexto(i));
        lideres = lideres.map(i => normalizarTexto(i));
        classificacoes = classificacoes.map(i => normalizarTexto(i));
        
        const popular = (el, arr) => {
            if(!el) return;
            el.innerHTML = '<option value="">Todos</option>' + arr.map(i => `<option value="${i}">${i}</option>`).join('');
        };
        popular(filterArea, areas);
        popular(filterLider, lideres);
        popular(filterClassificacao, classificacoes);
        if(metaAreaSelect) metaAreaSelect.innerHTML = '<option value="">Selecione...</option>' + areas.map(i => `<option value="${i}">${i}</option>`).join('');
    } catch (e) { console.error("Erro ao carregar filtros", e); }
}

// ================================================================
// 🎮 CONTROLADOR DE CARREGAMENTO (DECISOR DE MODO)
// ================================================================

function temFiltrosAtivos() {
    const s = searchBar ? searchBar.value : '';
    const st = filterStatus ? filterStatus.value : '';
    const a = filterArea ? filterArea.value : '';
    const l = filterLider ? filterLider.value : '';
    const c = filterClassificacao ? filterClassificacao.value : '';
    const p = filterPCD ? filterPCD.value : '';
    return (s || st || a || l || c || p);
}

async function carregarColaboradores() {
    currentPage = 0;
    
    // Limpa a tela antes de buscar
    dashboardContainer.innerHTML = '';
    loadingIndicator.style.display = 'block';
    if(loadMoreButton) loadMoreButton.style.display = 'none';
    
    listaColaboradoresGlobal = [];

    // DECISÃO: Se tem filtro, busca TUDO. Se não, pagina.
    if (temFiltrosAtivos()) {
        await fetchAllAndFilter();
    } else {
        await fetchPaginated();
    }
}

async function carregarMais() {
    currentPage++;
    if(loadMoreButton) {
        loadMoreButton.disabled = true;
        loadMoreButton.textContent = 'Carregando...';
    }
    await fetchPaginated();
}

// ================================================================
// 1. MODO CARREGAMENTO TOTAL (COM FILTROS)
// ================================================================
async function fetchAllAndFilter() {
    loadingIndicator.textContent = "Filtrando resultados (Buscando em toda a base)...";
    
    let paramsObj = {
        search: searchBar ? searchBar.value : '',
        status: filterStatus ? filterStatus.value : '',
        area: filterArea ? filterArea.value : '',
        lider: filterLider ? filterLider.value : '',
        classificacao: filterClassificacao ? filterClassificacao.value : ''
    };
    if (usuarioPerfil === 'user') paramsObj = { cpf_filtro: usuarioCPF };

    let page = 0;
    let keepFetching = true;
    let allData = [];

    try {
        while (keepFetching) {
            paramsObj.page = page;
            const params = new URLSearchParams(paramsObj);
            const res = await fetch(`${API_URL}/colaboradores?${params}`);
            const { data } = await res.json();

            if (!data || data.length === 0) {
                keepFetching = false;
            } else {
                allData = allData.concat(data);
                if (data.length < 30) keepFetching = false; 
                page++;
                if (page > 200) keepFetching = false; // Trava de segurança
            }
        }

        const pcdFiltro = filterPCD ? filterPCD.value : '';
        const pcdTargetNorm = pcdFiltro ? normalizarStatusPCD(pcdFiltro) : '';

        const filteredData = allData.filter(colab => {
            const c = normalizarObjeto(colab);
            if (pcdTargetNorm) {
                const pcdBancoNorm = normalizarStatusPCD(c.PCD);
                if (pcdBancoNorm !== pcdTargetNorm) return false;
            }
            return true;
        });

        loadingIndicator.style.display = 'none';

        if (filteredData.length === 0) {
            dashboardContainer.innerHTML = `<p>Nenhum colaborador encontrado com os filtros selecionados.</p>`;
        } else {
            verificarSegurancaUser(filteredData);
            filteredData.forEach(colab => {
                const colaboradorNormalizado = normalizarObjeto(colab);
                const index = listaColaboradoresGlobal.push(colaboradorNormalizado) - 1;
                dashboardContainer.innerHTML += criarCardColaborador(colaboradorNormalizado, index);
            });
        }
        
        if(loadMoreButton) loadMoreButton.style.display = 'none';

    } catch (e) {
        console.error(e);
        loadingIndicator.textContent = "Erro ao processar filtros.";
    }
}

// ================================================================
// 2. MODO PAGINADO (SEM FILTROS)
// ================================================================
async function fetchPaginated() {
    loadingIndicator.textContent = "Carregando colaboradores...";
    
    let paramsObj = { page: currentPage };
    if (usuarioPerfil === 'user') paramsObj = { cpf_filtro: usuarioCPF, page: 0 };
    
    const params = new URLSearchParams(paramsObj);

    try {
        const res = await fetch(`${API_URL}/colaboradores?${params}`);
        const { data } = await res.json();

        loadingIndicator.style.display = 'none';

        if (!data || data.length === 0) {
            if(currentPage === 0) dashboardContainer.innerHTML = "<p>Nenhum dado encontrado.</p>";
            return;
        }

        verificarSegurancaUser(data);

        data.forEach(colaborador => {
            const colaboradorNormalizado = normalizarObjeto(colaborador);
            const index = listaColaboradoresGlobal.push(colaboradorNormalizado) - 1;
            dashboardContainer.innerHTML += criarCardColaborador(colaboradorNormalizado, index);
        });

        if(loadMoreButton) {
            loadMoreButton.disabled = false;
            loadMoreButton.textContent = 'Carregar Mais';
            loadMoreButton.style.display = (usuarioPerfil === 'user' || data.length < 30) ? 'none' : 'block';
        }

    } catch (error) {
        console.error(error);
        dashboardContainer.innerHTML = `<p style="color:red">Erro de conexão.</p>`;
    }
}

function verificarSegurancaUser(data) {
    if (usuarioPerfil === 'user' && data.length > 0) {
        const dadosUsuarioFrescos = data[0]; 
        if (dadosUsuarioFrescos) {
            const statusFresco = (dadosUsuarioFrescos.SITUACAO || '').toUpperCase();
            const classifFresco = (dadosUsuarioFrescos.CLASSIFICACAO || '').toUpperCase();
            if (statusFresco.includes('DESLIGADO') || classifFresco === 'DESLIGAR') {
                alert('Acesso interrompido.\nProcure o seu gestor imediato.');
                Sessao.limpar();
                throw new Error("Bloqueio de segurança ativo.");
            }
        }
    }
}

function criarCardColaborador(colab, index) {
    const status = colab.SITUACAO || 'Indefinido';
    const statusClass = status.includes('AFASTADO') ? 'status-afastado' : (status.includes('DESLIGADO') ? 'status-desligados' : 'status-ativo');
    
    const pcdValor = normalizarStatusPCD(colab.PCD);
    const pcdClass = (pcdValor === 'SIM') ? 'pcd-sim' : 'pcd-nao';
    
    let classificacaoClass = 'classificacao-sem';
    const classif = (colab.CLASSIFICACAO || '').toUpperCase();
    if(classif === 'BOM') classificacaoClass = 'classificacao-bom';
    else if(classif === 'MUITO BOM') classificacaoClass = 'classificacao-muito-bom';
    else if(classif === 'RECUPERAR') classificacaoClass = 'classificacao-recuperar';
    else if(classif === 'DESLIGAR') classificacaoClass = 'classificacao-desligar';
    else if(classif === 'PREPARAR') classificacaoClass = 'classificacao-preparar';

    const fotoSrc = colab.FOTO_PERFIL || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
    const v = (val) => val || '';

    const tempoEmpresaRaw = colab['TEMPO_DE_EMPRESA'];
    const tempoEmpresa = formatarTempoDeEmpresa(tempoEmpresaRaw);

    const nome = v(colab.NOME);
    const cpf = formatarCPF(colab.CPF);
    const funcao = v(colab['CARGO_ATUAL']);
    const area = v(colab.ATIVIDADE);
    const escolaridade = v(colab.ESCOLARIDADE);
    const salario = formatarSalario(colab.SALARIO);
    const pcd = pcdValor; 
    const telefone = v(colab.CONTATO);
    const telEmergencia = v(colab['CONT_FAMILIAR']);
    const turno = v(colab.TURNO);
    const lider = v(colab.LIDER);
    const ultimaFuncao = v(colab.CARGO_ANTIGO);
    const dataPromocao = formatarDataExcel(colab['DATA_DA_PROMOCAO']);
    
    let classificacao = colab.CLASSIFICACAO || 'NOVO';
    if (classificacao === 'SEM') classificacao = 'NOVO';

    return `
        <div class="employee-card ${statusClass}">
            <div class="card-header">
                <img src="${fotoSrc}" alt="Foto" style="object-fit:cover;">
                <div class="header-info">
                    <h3>${nome}</h3>
                    <span class="status-badge ${statusClass}">${status}</span>
                </div>
            </div>
            <div class="card-body">
                <p><strong>NOME:</strong> <span>${nome}</span></p>
                <p><strong>CPF:</strong> <span>${cpf}</span></p>
                <p><strong>FUNÇÃO ATUAL:</strong> <span>${funcao}</span></p>
                <p><strong>AREA:</strong> <span>${area}</span></p>
                <p><strong>TEMPO DE EMPRESA:</strong> <span>${tempoEmpresa}</span></p>
                <p><strong>ESCOLARIDADE:</strong> <span>${escolaridade}</span></p>
                <p><strong>SALARIO:</strong> <span>${salario}</span></p>
                <p><strong>PCD:</strong> <span class="pcd-badge ${pcdClass}">${pcd}</span></p>
                <p><strong>PLANO DE SAÚDE:</strong> <span></span></p>
                <p><strong>ENDEREÇO COMPLETO:</strong> <span></span></p>
                <p><strong>TELEFONE DO COLABORADOR:</strong> <span>${telefone}</span></p>
                <p><strong>TELEFONE DE EMERGENCIA:</strong> <span>${telEmergencia}</span></p>
                <p><strong>TURNO:</strong> <span>${turno}</span></p>
                <p><strong>LIDER IMEDIATO:</strong> <span>${lider}</span></p>
                <p><strong>ULTIMA FUNÇÃO:</strong> <span>${ultimaFuncao}</span></p>
                <p><strong>DATA ULTIMA PROMOÇÃO:</strong> <span>${dataPromocao}</span></p>
                <p><strong>CICLO DE GENTE:</strong> <span class="classificacao-badge ${classificacaoClass}">${classificacao}</span></p>
            </div>
            <div class="card-footer" onclick="abrirModalDetalhes(${index})">
                <span class="material-icons-outlined expand-icon">keyboard_arrow_down</span>
            </div>
        </div>
    `;
}

function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

async function uploadFotoPerfil(file, cpf) {
    try {
        const resizedBase64 = await compressImage(file, 300, 0.7);
        const res = await fetch(`${API_URL}/upload-foto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: cpf, imagemBase64: resizedBase64 })
        });
        if (res.ok) { alert('Foto atualizada com sucesso!'); carregarColaboradores(); fecharModal(); } 
        else { alert('Erro ao salvar foto.'); }
    } catch (err) { console.error(err); alert('Erro ao processar imagem.'); }
}

window.handleFileSelect = function(input, cpf) {
    if (input.files && input.files[0]) uploadFotoPerfil(input.files[0], cpf);
};

function abrirModalDetalhes(index) {
    const colab = listaColaboradoresGlobal[index];
    if (!colab) return;

    const modal = document.getElementById('modal-detalhes');
    const header = document.getElementById('modal-header');
    const grid = document.getElementById('modal-dados-grid');

    const nome = colab.NOME || '';
    const status = colab.SITUACAO || '';
    const fotoSrc = colab.FOTO_PERFIL || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
    const tempoEmpresa = formatarTempoDeEmpresa(colab['TEMPO_DE_EMPRESA']);

    let classificacao = colab.CLASSIFICACAO || 'NOVO';
    if (classificacao === 'SEM') classificacao = 'NOVO';
    
    const pcdValor = normalizarStatusPCD(colab.PCD);

    header.innerHTML = `
        <div class="avatar-upload-wrapper">
            <img src="${fotoSrc}" alt="${nome}">
            <div class="camera-badge" onclick="document.getElementById('file-input-${index}').click()" title="Alterar Foto">
                <span class="material-icons-outlined">photo_camera</span>
            </div>
            <input type="file" id="file-input-${index}" accept="image/*" style="display: none;" onchange="handleFileSelect(this, '${colab.CPF}')">
        </div>
        <div>
            <h2 style="margin:0; font-size:1.5em;">${nome}</h2>
            <span class="status-badge" style="background-color:rgba(255,255,255,0.2); border:1px solid #fff; margin-top:5px;">${status}</span>
        </div>
    `;

    grid.innerHTML = `
        <div class="modal-item"><strong>CPF</strong> <span>${formatarCPF(colab.CPF)}</span></div>
        <div class="modal-item"><strong>Função</strong> <span>${colab['CARGO_ATUAL'] || ''}</span></div>
        <div class="modal-item"><strong>Área</strong> <span>${colab.ATIVIDADE || ''}</span></div>
        <div class="modal-item"><strong>Salário</strong> <span>${formatarSalario(colab.SALARIO)}</span></div>
        <div class="modal-item"><strong>Tempo de Casa</strong> <span>${tempoEmpresa}</span></div>
        <div class="modal-item"><strong>Escolaridade</strong> <span>${colab.ESCOLARIDADE || ''}</span></div>
        <div class="modal-item"><strong>PCD</strong> <span>${pcdValor}</span></div>
        <div class="modal-item"><strong>Líder</strong> <span>${colab.LIDER || ''}</span></div>
        <div class="modal-item"><strong>Turno</strong> <span>${colab.TURNO || ''}</span></div>
        <div class="modal-item"><strong>CLASSIFICAÇÃO CICLO DE GENTE</strong> <span>${classificacao}</span></div>
        <div class="modal-item"><strong>DATA ULTIMA PROMOÇÃO</strong> <span>${formatarDataExcel(colab['DATA DA PROMOCAO'])}</span></div>
        <div class="modal-item" style="grid-column: 1/-1; background:#f9f9f9; padding:10px; border-radius:4px;">    
        ${gerarHtmlPDI(colab)}
        </div>
    `;
    modal.style.display = 'flex';
}

function gerarHtmlPDI(colab) {
    let html = `
        <div class="pdi-section">
            <h3>Ciclo de Gente - Plano de Desenvolvimento</h3>
            <div class="pdi-container">
    `;
    let encontrouAlgum = false;
    for (let i = 1; i <= 7; i++) {
        const competencia = colab[`COMPETENCIA_${i}`]; 
        if (competencia) {
            encontrouAlgum = true;
            const status = colab[`STATUS_${i}`] || 'Pendente';
            const situacao = colab[`SITUACAO_DA_ACAO_${i}`] || '-';
            const acao = colab[`O_QUE_FAZER_${i}`] || '-';
            const motivo = colab[`POR_QUE_FAZER_${i}`] || '-';
            const quem = colab[`QUE_PODE_ME_AJUDAR_${i}`] || '-';
            const como = colab[`COMO_VOU_FAZER_${i}`] || '-';
            const dataFim = formatarDataExcel(colab[`DATA_DE_TERMINO_${i}`]);

            html += `
                <div class="pdi-card" data-status="${status.toUpperCase()}">
                    <h4>${i}. ${competencia}</h4>
                    <div class="pdi-details">
                        <div class="pdi-item"><strong>Situação Atual</strong> <span>${situacao}</span></div>
                        <div class="pdi-item"><strong>Ação (O que fazer)</strong> <span>${acao}</span></div>
                        <div class="pdi-item"><strong>Motivo (Por que)</strong> <span>${motivo}</span></div>
                        <div class="pdi-item"><strong>Apoio (Quem ajuda)</strong> <span>${quem}</span></div>
                        <div class="pdi-item"><strong>Como vou fazer</strong> <span>${como}</span></div>
                        <div class="pdi-item"><strong>Prazo</strong> <span>${dataFim}</span></div>
                        <div class="pdi-item"><strong>Status</strong> <span>${status}</span></div>
                    </div>
                </div>
            `;
        }
    }
    if (!encontrouAlgum) html += `<p style="color:#666; padding:10px;">Nenhum plano de ação cadastrado.</p>`;
    html += `</div></div>`;
    return html;
}

function fecharModal() { document.getElementById('modal-detalhes').style.display = 'none'; }
window.onclick = function(event) { if (event.target == document.getElementById('modal-detalhes')) fecharModal(); };

// ==========================================
// 📊 DASHBOARD & EXPORTAÇÃO
// ==========================================
async function carregarDadosDashboard(renderizarGraficos = false) {
    if (usuarioPerfil === 'user') return; 
    try {
        const res = await fetch(`${API_URL}/dashboard-stats`);
        if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
        let data = await res.json();
        if(!data || !data.stats || !data.areas) return;
        renderizarTabelasRelatorio(data.stats, data.areas, data.totalAtivos);
        if (renderizarGraficos) renderizarGraficosChartJS(data.stats, data.areas);
    } catch (e) { console.error("Erro dashboard stats", e); }
}

function renderizarTabelasRelatorio(stats, areas, totalAtivos) {
    if(!reportTableBodyQLP) return;
    let htmlQLP = '', htmlPCD = '', htmlJovem = '';
    const quotaPCD = document.getElementById('quota-pcd-value');
    if(quotaPCD) quotaPCD.textContent = Math.ceil(totalAtivos * (totalAtivos > 1000 ? 0.05 : 0.02));
    const quotaJovem = document.getElementById('quota-jovem-value');
    if(quotaJovem) quotaJovem.textContent = Math.ceil(totalAtivos * 0.05);
    
    areas.forEach(a => {
        const s = stats[a] || { qlp: 0, pcd: 0, jovem: 0, meta: {} };
        const meta = s.meta || {}; 
        htmlQLP += `<tr><td>${a}</td><td>${meta.meta || 0}</td><td>${s.qlp}</td></tr>`;
        if(meta.meta_pcd || s.pcd > 0) 
            htmlPCD += `<tr><td>${a}</td><td>${meta.meta_pcd || 0}</td><td>${s.pcd}</td></tr>`;
        if(meta.meta_jovem || s.jovem > 0) 
            htmlJovem += `<tr><td>${a}</td><td>${meta.meta_jovem || 0}</td><td>${s.jovem}</td></tr>`;
    });
    reportTableBodyQLP.innerHTML = htmlQLP;
    reportTableBodyPCD.innerHTML = htmlPCD || '<tr><td colspan="3">Vazio</td></tr>';
    reportTableBodyJovem.innerHTML = htmlJovem || '<tr><td colspan="3">Vazio</td></tr>';
}

function renderizarGraficosChartJS(stats, areas) {
    const criarDataset = (keyMeta, keyReal) => {
        const labels = [], dMeta = [], dReal = [], dGap = [];
        areas.forEach(a => {
            const s = stats[a] || { meta: {} };
            const m = (s.meta && s.meta[keyMeta]) || 0;
            const r = s[keyReal] || 0;
            if (m > 0 || r > 0) {
                labels.push(a); dMeta.push(m); dReal.push(r); dGap.push(Math.max(0, m - r));
            }
        });
        return { labels, dMeta, dReal, dGap };
    };
    const render = (id, data, instance) => {
        const ctxElement = document.getElementById(id);
        if(!ctxElement) return null;
        const ctx = ctxElement.getContext('2d');
        if(instance) instance.destroy();
        return new Chart(ctx, {
            type: 'bar', plugins: [ChartDataLabels],
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Meta', data: data.dMeta, backgroundColor: 'rgba(54, 162, 235, 0.6)' },
                    { label: 'Real', data: data.dReal, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
                    { label: 'Gap', data: data.dGap, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
                ]
            },
            options: { responsive: true, plugins: { datalabels: { anchor: 'end', align: 'top', formatter: v=>v>0?v:'' } } }
        });
    };
    metaChartQLP = render('grafico-metas-qlp', criarDataset('meta', 'qlp'), metaChartQLP);
    metaChartPCD = render('grafico-metas-pcd', criarDataset('meta_pcd', 'pcd'), metaChartPCD);
    metaChartJovem = render('grafico-metas-jovem', criarDataset('meta_jovem', 'jovem'), metaChartJovem);
}

async function handleMetaSubmit(e) {
    e.preventDefault();
    metaSubmitButton.disabled = true;
    try {
        await fetch(`${API_URL}/metas`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                area: metaAreaSelect.value, meta: metaValorInput.value,
                meta_pcd: metaPCDInput.value, meta_jovem: metaJovemInput.value
            })
        });
        metaSuccessMessage.style.visibility = 'visible';
        setTimeout(() => metaSuccessMessage.style.visibility = 'hidden', 3000);
        metaForm.reset();
        carregarDadosDashboard(); 
    } catch (err) { alert('Erro ao salvar meta.'); } finally { metaSubmitButton.disabled = false; }
}

// ==========================================
// 🏖️ FÉRIAS
// ==========================================
const formFerias = document.getElementById('form-solicitar-ferias');
if (formFerias) {
    formFerias.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inicio = document.getElementById('ferias-inicio').value;
        const fim = document.getElementById('ferias-fim').value;
        if (inicio > fim) return alert('A data de fim deve ser depois do início.');
        if(!confirm(`Confirma solicitação de férias de ${formatarDataExcel(inicio)} até ${formatarDataExcel(fim)}?`)) return;

        try {
            const res = await fetch(`${API_URL}/ferias/solicitar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cpf: usuarioCPF, data_inicio: inicio, data_fim: fim })
            });
            const data = await res.json();
            if(data.sucesso) { alert('Solicitação enviada com sucesso!'); carregarDadosFerias(); } 
            else { alert('Erro: ' + data.mensagem); }
        } catch(err) { console.error(err); alert('Erro de conexão'); }
    });
}

async function carregarDadosFerias() {
    const cpfLimpo = String(usuarioCPF).replace(/\D/g, '');
    const btnExport = document.getElementById('btn-exportar-ferias');
    try {
        const params = new URLSearchParams({ cpf: cpfLimpo, perfil: usuarioPerfil, nome_usuario: usuarioNome });
        const res = await fetch(`${API_URL}/ferias/listar?${params}`);
        const json = await res.json();
        if (!json.sucesso) throw new Error(json.error);
        cacheFerias = json.dados;

        const tabelaAprovacao = document.getElementById('lista-aprovacao-body');
        const painelLider = document.getElementById('area-aprovacao-lider');
        const tabelaHistorico = document.getElementById('lista-ferias-body');
        if(tabelaAprovacao) tabelaAprovacao.innerHTML = '';
        if(tabelaHistorico) tabelaHistorico.innerHTML = '';

        let souLiderDeAlguem = false;
        cacheFerias.forEach(item => {
            const dataIni = formatarDataExcel(item.data_inicio);
            const dataFim = formatarDataExcel(item.data_fim);
            let badgeClass = item.status === 'APROVADO' ? 'status-ativo' : (item.status === 'REJEITADO' ? 'status-desligados' : 'status-afastado');
            const badge = `<span class="status-badge ${badgeClass}">${item.status}</span>`;
            const ehMinha = String(item.cpf) === String(cpfLimpo);
            if(tabelaHistorico) tabelaHistorico.innerHTML += `<tr><td>${item.nome} ${ehMinha ? '(Eu)' : ''}</td><td>${dataIni}</td><td>${dataFim}</td><td>${badge}</td></tr>`;

            const liderDaSolicitacao = (item.lider || '').toUpperCase();
            const meuNome = (usuarioNome || '').toUpperCase();
            if (liderDaSolicitacao.includes(meuNome) && !ehMinha && item.status === 'PENDENTE') {
                souLiderDeAlguem = true;
                if(tabelaAprovacao) {
                    tabelaAprovacao.innerHTML += `<tr><td><strong>${item.nome}</strong></td><td>${dataIni}</td><td>${dataFim}</td><td>${item.dias_totais} dias</td><td><button onclick="gerenciarFerias(${item.id}, 'APROVADO')" style="background:#28a745; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">✔</button><button onclick="gerenciarFerias(${item.id}, 'REJEITADO')" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer; margin-left:5px;">✖</button></td></tr>`;
                }
            }
        });
        if (painelLider) {
            painelLider.style.display = (souLiderDeAlguem || usuarioPerfil === 'admin') ? 'block' : 'none';
            if(btnExport && (souLiderDeAlguem || usuarioPerfil === 'admin')) btnExport.style.display = 'inline-block';
        }
        if (tabelaAprovacao && tabelaAprovacao.innerHTML === '') tabelaAprovacao.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma solicitação pendente.</td></tr>';
    } catch (e) { console.error(e); }
}

async function gerenciarFerias(id, acao) {
    if(!confirm(`Deseja realmente definir como ${acao}?`)) return;
    try {
        const res = await fetch(`${API_URL}/ferias/gerenciar`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_solicitacao: id, acao: acao, nome_lider: usuarioNome })
        });
        const data = await res.json();
        if (data.sucesso) { alert(data.mensagem); carregarDadosFerias(); } else { alert('❌ ERRO: ' + data.mensagem); }
    } catch (e) { console.error(e); alert('Erro de conexão.'); }
}

function exportarRelatorioFerias() {
    if(!cacheFerias.length) return alert("Nada para exportar");
    let csvContent = "data:text/csv;charset=utf-8,Colaborador;Lider;Data Inicio;Data Fim;Dias;Status\n";
    cacheFerias.forEach(row => { csvContent += `${row.nome};${row.lider};${formatarDataExcel(row.data_inicio)};${formatarDataExcel(row.data_fim)};${row.dias_totais};${row.status}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_ferias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 🚀 NOVA FUNÇÃO DE EXPORTAÇÃO (BUSCA TUDO DO BANCO/API)
async function exportarRelatorioGeral() {
    const btnContentOriginal = btnExportarGeral.innerHTML;
    btnExportarGeral.disabled = true;
    btnExportarGeral.innerHTML = '<span class="material-icons-outlined" style="animation:spin 1s linear infinite; margin-right:5px;">sync</span> Baixando Banco Completo...';

    // Se tiver filtros na tela, respeitamos. Se não, baixa TUDO mesmo.
    let paramsObj = {
        search: searchBar ? searchBar.value : '',
        status: filterStatus ? filterStatus.value : '',
        area: filterArea ? filterArea.value : '',
        lider: filterLider ? filterLider.value : '',
        classificacao: filterClassificacao ? filterClassificacao.value : ''
    };
    if (usuarioPerfil === 'user') paramsObj = { cpf_filtro: usuarioCPF };

    let allData = [];
    let page = 0;
    let keepFetching = true;

    try {
        // Loop para baixar TODAS as páginas da API
        while (keepFetching) {
            paramsObj.page = page;
            const params = new URLSearchParams(paramsObj);
            const res = await fetch(`${API_URL}/colaboradores?${params}`);
            const json = await res.json();
            const data = json.data;

            if (!data || data.length === 0) {
                keepFetching = false;
            } else {
                allData = allData.concat(data);
                if (data.length < 30) keepFetching = false; // Se vier menos de 30, acabou
                page++;
                if (page > 200) keepFetching = false; // Trava de segurança (max 6000 registros por vez)
            }
        }

        // Aplica filtro PCD no cliente (já que API não filtra)
        if (filterPCD && filterPCD.value) {
            const pcdTargetNorm = normalizarStatusPCD(filterPCD.value);
            allData = allData.filter(colab => {
                 return normalizarStatusPCD(colab.PCD) === pcdTargetNorm;
            });
        }

        if (allData.length === 0) {
            alert("Nenhum dado encontrado com os filtros atuais para exportar.");
        } else {
            // Gera o CSV com os dados completos
            gerarCSVExportacao(allData);
        }

    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao tentar baixar o banco completo.");
    } finally {
        btnExportarGeral.disabled = false;
        btnExportarGeral.innerHTML = btnContentOriginal;
    }
}

function gerarCSVExportacao(dados) {
    const colunas = [
        { header: "Nome", key: "NOME" },
        { header: "CPF", key: "CPF", format: formatarCPF },
        { header: "Situação", key: "SITUACAO" },
        { header: "Cargo Atual", key: "CARGO_ATUAL" },
        { header: "Área", key: "ATIVIDADE" },
        { header: "Salário", key: "SALARIO", format: formatarSalario },
        { header: "Tempo de Empresa", key: "TEMPO_DE_EMPRESA", format: formatarTempoDeEmpresa },
        { header: "Escolaridade", key: "ESCOLARIDADE" },
        { header: "PCD", key: "PCD" },
        { header: "Telefone", key: "CONTATO" },
        { header: "Telefone Emergência", key: "CONT_FAMILIAR" },
        { header: "Turno", key: "TURNO" },
        { header: "Líder Imediato", key: "LIDER" },
        { header: "Cargo Antigo", key: "CARGO_ANTIGO" },
        { header: "Data Ultima promoção", key: "DATA_DA_PROMOCAO" },
        { header: "Ciclo de Gente", key: "CLASSIFICACAO" },
    ];

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += colunas.map(c => c.header).join(";") + "\n";

    dados.forEach(item => {
        const linha = colunas.map(col => {
            let valor = item[col.key] || "";
            // Normaliza PCD para exportação limpa
            if (col.key === 'PCD') valor = normalizarStatusPCD(valor);
            
            if (col.format) valor = col.format(valor);
            valor = String(valor).replace(/"/g, '""'); 
            return `"${valor}"`;
        }).join(";");
        csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Relatorio_Geral_Completo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

;(function() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupDashboard);
    else setupDashboard();
})();