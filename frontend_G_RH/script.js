// frontend_G_RH/script.js

// URL da API Backend
const API_URL = 'http://localhost:3000';

// Variáveis Globais de UI
let dashboardContainer, loadingIndicator, searchBar, filterStatus, filterArea, filterLider, filterClassificacao, loadMoreButton;
let metaForm, metaAreaSelect, metaValorInput, metaPCDInput, metaJovemInput, metaSubmitButton, metaSuccessMessage;
let reportTableBodyQLP, reportTableBodyPCD, reportTableBodyJovem;
let metaChartQLP = null, metaChartPCD = null, metaChartJovem = null;
let currentPage = 0;
let listaColaboradoresGlobal = []; 
let cacheFerias = []; // Guarda dados de férias para exportação

// Dados do Usuário Logado
const usuarioPerfil = sessionStorage.getItem('usuarioPerfil'); // 'admin' ou 'user'
const usuarioCPF = sessionStorage.getItem('usuarioCPF');

// ======== FUNÇÕES DE FORMATAÇÃO ========
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
    // ISO String
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
            const parteData = valor.split('T')[0];
            const [ano, mes, dia] = parteData.split('-');
            return `${dia}/${mes}/${ano}`;
        } catch (e) { return valor; }
    }
    // Serial Number
    const serial = Number(valor);
    if (isNaN(serial) || serial < 20000) return String(valor);
    try {
        const d = new Date((serial - 25569) * 86400000);
        d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
        return d.toLocaleDateString('pt-BR');
    } catch (e) { return String(valor); }
}

function formatarTempoDeEmpresa(dias) {
    if (!dias) return '';
    const n = parseInt(dias, 10);
    if (isNaN(n) || n <= 0) return ''; 
    const a = Math.floor(n / 365.25);
    const m = Math.floor((n % 365.25) / 30.44); 
    let res = '';
    if (a > 0) res += `${a} ${a === 1 ? 'ano' : 'anos'}`;
    if (m > 0) {
        if (a > 0) res += ' e ';
        res += `${m} ${m === 1 ? 'mês' : 'meses'}`;
    }
    return (a === 0 && m === 0) ? "Menos de 1 mês" : res;
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

    // Inicializar Menu Mobile
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

    function toggleMenu() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    function closeMenu() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    if (btnMenu) btnMenu.addEventListener('click', toggleMenu);
    if (btnClose) btnClose.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    const links = document.querySelectorAll('.nav-link');
    links.forEach(l => l.addEventListener('click', () => {
        if(window.innerWidth <= 768) closeMenu();
    }));
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
    if (navSair) navSair.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.clear();
        window.location.href = 'login.html';
    });
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
        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/filtros`, { headers: getAuthHeaders() });
        if(handleAuthError(res)) return; // Verifica expiração

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

async function carregarColaboradores() {
    currentPage = 0;
    if (!loadingIndicator || !dashboardContainer) return;
    loadingIndicator.style.display = 'block';
    dashboardContainer.innerHTML = '';
    listaColaboradoresGlobal = [];
    if(loadMoreButton) loadMoreButton.style.display = 'none';
    await fetchColaboradores();
}

async function carregarMais() {
    currentPage++;
    if(loadMoreButton) {
        loadMoreButton.disabled = true;
        loadMoreButton.textContent = 'Carregando...';
    }
    await fetchColaboradores();
}

async function fetchColaboradores() {
    let paramsObj = {
        page: currentPage,
        search: searchBar ? searchBar.value : '',
        status: filterStatus ? filterStatus.value : '',
        area: filterArea ? filterArea.value : '',
        lider: filterLider ? filterLider.value : '',
        classificacao: filterClassificacao ? filterClassificacao.value : ''
    };

    if (usuarioPerfil === 'user') {
        paramsObj = { cpf_filtro: usuarioCPF, page: 0 };
    }

    const params = new URLSearchParams(paramsObj);

    try {
        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/colaboradores?${params}`, { headers: getAuthHeaders() });
        if(handleAuthError(res)) return; // Verifica expiração
        
        const { data, count } = await res.json();

        loadingIndicator.style.display = 'none';

        if (!data || data.length === 0) {
            if(currentPage === 0) dashboardContainer.innerHTML = "<p>Nenhum dado encontrado.</p>";
            return;
        }

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
        dashboardContainer.innerHTML = `<p style="color:red">Erro de conexão com o servidor.</p>`;
    }
}

function criarCardColaborador(colab, index) {
    const status = colab.SITUACAO || 'Indefinido';
    const statusClass = status.includes('AFASTADO') ? 'status-afastado' : (status.includes('DESLIGADO') ? 'status-desligados' : 'status-ativo');
    const pcdClass = (colab.PCD === 'SIM') ? 'pcd-sim' : 'pcd-nao';
    
    let classificacaoClass = 'classificacao-sem';
    const classif = (colab.CLASSIFICACAO || '').toUpperCase();
    if(classif === 'BOM') classificacaoClass = 'classificacao-bom';
    else if(classif === 'MUITO BOM') classificacaoClass = 'classificacao-muito-bom';
    else if(classif === 'RECUPERAR') classificacaoClass = 'classificacao-recuperar';
    else if(classif === 'DESLIGAR') classificacaoClass = 'classificacao-desligar';
    else if(classif === 'PREPARAR') classificacaoClass = 'classificacao-preparar';

    const fotoSrc = colab.FOTO_PERFIL || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
    const v = (val) => val || '';

    const nome = v(colab.NOME);
    const cpf = formatarCPF(colab.CPF);
    const funcao = v(colab['CARGO_ATUAL']);
    const area = v(colab.ATIVIDADE);
    const tempoEmpresa = formatarTempoDeEmpresa(colab['TEMPO_DE_EMPRESA']);
    const escolaridade = v(colab.ESCOLARIDADE);
    const salario = formatarSalario(colab.SALARIO);
    const pcd = colab.PCD || 'NÃO';
    const telefone = v(colab.CONTATO);
    const telEmergencia = v(colab['CONT_FAMILIAR']);
    const turno = v(colab.TURNO);
    const lider = v(colab.LIDER);
    const ultimaFuncao = v(colab.CARGO_ANTIGO);
    const dataPromocao = formatarDataExcel(colab['DATA_DA_PROMOCAO']);
    const classificacao = colab.CLASSIFICACAO || 'SEM';

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
        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/upload-foto`, {
            method: 'POST',
            headers: getAuthHeaders(), // Inclui Auth e Content-Type
            body: JSON.stringify({ cpf: cpf, imagemBase64: resizedBase64 })
        });

        if(handleAuthError(res)) return; // Verifica expiração

        if (res.ok) {
            alert('Foto atualizada com sucesso!');
            carregarColaboradores();
            fecharModal();
        } else {
            alert('Erro ao salvar foto.');
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao processar imagem.');
    }
}

window.handleFileSelect = function(input, cpf) {
    if (input.files && input.files[0]) {
        uploadFotoPerfil(input.files[0], cpf);
    }
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
        <div class="modal-item"><strong>Tempo de Casa</strong> <span>${formatarTempoDeEmpresa(colab['TEMPO DE EMPRESA'])}</span></div>
        <div class="modal-item"><strong>Escolaridade</strong> <span>${colab.ESCOLARIDADE || ''}</span></div>
        <div class="modal-item"><strong>PCD</strong> <span>${colab.PCD || 'NÃO'}</span></div>
        <div class="modal-item"><strong>Líder</strong> <span>${colab.LIDER || ''}</span></div>
        <div class="modal-item"><strong>Turno</strong> <span>${colab.TURNO || ''}</span></div>
        <div class="modal-item"><strong>CLASSIFICAÇÃO CICLO DE GENTE</strong> <span>${colab.CLASSIFICACAO || '-'}</span></div>
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

function fecharModal() {
    document.getElementById('modal-detalhes').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('modal-detalhes');
    if (event.target == modal) modal.style.display = "none";
};

// ==========================================
// 📊 DASHBOARD (CORREÇÃO DO ERRO DE LEITURA)
// ==========================================
async function carregarDadosDashboard(renderizarGraficos = false) {
    if (usuarioPerfil === 'user') return; 
    try {
        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/dashboard-stats`, { headers: getAuthHeaders() });
        if(handleAuthError(res)) return;

        if (!res.ok) throw new Error(`Erro na API: ${res.status}`);
        
        let data = await res.json();
        
        if(!data || !data.stats || !data.areas) return;

        const { stats, totalAtivos, areas } = data;
        renderizarTabelasRelatorio(stats, areas, totalAtivos);
        if (renderizarGraficos) renderizarGraficosChartJS(stats, areas);
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
        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/metas`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({
                area: metaAreaSelect.value, meta: metaValorInput.value,
                meta_pcd: metaPCDInput.value, meta_jovem: metaJovemInput.value
            })
        });

        if(handleAuthError(res)) return;

        metaSuccessMessage.style.visibility = 'visible';
        setTimeout(() => metaSuccessMessage.style.visibility = 'hidden', 3000);
        metaForm.reset();
        carregarDadosDashboard(); 
    } catch (err) { alert('Erro ao salvar meta.'); } finally { metaSubmitButton.disabled = false; }
}

// ==========================================
// 🏖️ LÓGICA DE FÉRIAS
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
            // AUTH: Adicionado header
            const res = await fetch(`${API_URL}/ferias/solicitar`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    cpf: sessionStorage.getItem('usuarioCPF'),
                    data_inicio: inicio,
                    data_fim: fim
                })
            });

            if(handleAuthError(res)) return;

            const data = await res.json();
            if(data.sucesso) {
                alert('Solicitação enviada com sucesso!');
                carregarDadosFerias();
            } else {
                alert('Erro: ' + data.mensagem);
            }
        } catch(err) { console.error(err); alert('Erro de conexão'); }
    });
}

async function carregarDadosFerias() {
    const usuarioNome = sessionStorage.getItem('usuarioNome');
    const usuarioPerfil = sessionStorage.getItem('usuarioPerfil');
    const usuarioCPF = sessionStorage.getItem('usuarioCPF');
    const cpfLimpo = String(usuarioCPF).replace(/\D/g, '');

    const btnExport = document.getElementById('btn-exportar-ferias');
    
    try {
        const params = new URLSearchParams({
            cpf: cpfLimpo,
            perfil: usuarioPerfil,
            nome_usuario: usuarioNome
        });

        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/ferias/listar?${params}`, { headers: getAuthHeaders() });
        if(handleAuthError(res)) return;

        const json = await res.json();
        
        if (!json.sucesso) throw new Error(json.error);

        const dados = json.dados;
        cacheFerias = dados;

        const tabelaAprovacao = document.getElementById('lista-aprovacao-body');
        const painelLider = document.getElementById('area-aprovacao-lider');
        const tabelaHistorico = document.getElementById('lista-ferias-body');

        if(tabelaAprovacao) tabelaAprovacao.innerHTML = '';
        if(tabelaHistorico) tabelaHistorico.innerHTML = '';

        let souLiderDeAlguem = false;

        dados.forEach(item => {
            const dataIni = formatarDataExcel(item.data_inicio);
            const dataFim = formatarDataExcel(item.data_fim);
            
            let badgeClass = '';
            if(item.status === 'APROVADO') badgeClass = 'status-ativo';
            else if(item.status === 'REJEITADO') badgeClass = 'status-desligados';
            else badgeClass = 'status-afastado';

            const badge = `<span class="status-badge ${badgeClass}">${item.status}</span>`;
            const ehMinha = String(item.cpf) === String(cpfLimpo);
            
            if(tabelaHistorico) {
                tabelaHistorico.innerHTML += `
                    <tr>
                        <td>${item.nome} ${ehMinha ? '(Eu)' : ''}</td>
                        <td>${dataIni}</td>
                        <td>${dataFim}</td>
                        <td>${badge}</td>
                    </tr>
                `;
            }

            const liderDaSolicitacao = (item.lider || '').toUpperCase();
            const meuNome = (usuarioNome || '').toUpperCase();

            // Verifica se sou o líder e não é minha própria solicitação
            if (liderDaSolicitacao.includes(meuNome) && !ehMinha && item.status === 'PENDENTE') {
                souLiderDeAlguem = true;
                if(tabelaAprovacao) {
                    tabelaAprovacao.innerHTML += `
                        <tr>
                            <td><strong>${item.nome}</strong></td>
                            <td>${dataIni}</td>
                            <td>${dataFim}</td>
                            <td>${item.dias_totais} dias</td>
                            <td>
                                <button onclick="gerenciarFerias(${item.id}, 'APROVADO')" style="background:#28a745; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">✔</button>
                                <button onclick="gerenciarFerias(${item.id}, 'REJEITADO')" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer; margin-left:5px;">✖</button>
                            </td>
                        </tr>
                    `;
                }
            }
        });

        if (painelLider) {
            if (souLiderDeAlguem || usuarioPerfil === 'admin') {
                painelLider.style.display = 'block';
                if(btnExport) btnExport.style.display = 'inline-block';
            } else {
                painelLider.style.display = 'none';
            }
        }

        if (tabelaAprovacao && tabelaAprovacao.innerHTML === '') {
            tabelaAprovacao.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma solicitação pendente para sua equipe.</td></tr>';
        }

    } catch (e) {
        console.error(e);
        // alert('Erro ao carregar férias.');
    }
}

async function gerenciarFerias(id, acao) {
    if(!confirm(`Deseja realmente definir como ${acao}?`)) return;

    try {
        // AUTH: Adicionado header
        const res = await fetch(`${API_URL}/ferias/gerenciar`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                id_solicitacao: id,
                acao: acao,
                nome_lider: sessionStorage.getItem('usuarioNome')
            })
        });

        if(handleAuthError(res)) return;

        const data = await res.json();
        
        if (data.sucesso) {
            alert(data.mensagem);
            carregarDadosFerias();
        } else {
            alert('❌ ERRO: ' + data.mensagem);
        }
    } catch (e) {
        console.error(e);
        alert('Erro de conexão.');
    }
}

function exportarRelatorioFerias() {
    if(!cacheFerias.length) return alert("Nada para exportar");
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Colaborador;Lider;Data Inicio;Data Fim;Dias;Status\n";

    cacheFerias.forEach(row => {
        csvContent += `${row.nome};${row.lider};${formatarDataExcel(row.data_inicio)};${formatarDataExcel(row.data_fim)};${row.dias_totais};${row.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_ferias.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

;(function() {
    if (sessionStorage.getItem('usuarioLogado') !== 'true') window.location.href = 'login.html';
    else {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupDashboard);
        else setupDashboard();
    }
})();