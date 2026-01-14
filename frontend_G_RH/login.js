// frontend_G_RH/login.js

const loginForm = document.getElementById('login-form');
const cpfInput = document.getElementById('cpf');
const senhaInput = document.getElementById('senha');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');

const modalNovaSenha = document.getElementById('modal-nova-senha');
const formCriarSenha = document.getElementById('form-criar-senha');
const cpfHiddenInput = document.getElementById('cpf-hidden');
const telefoneInput = document.getElementById('telefone-confirmacao');
const novaSenhaInput = document.getElementById('nova-senha');
const confirmarSenhaInput = document.getElementById('confirmar-senha');
const btnSalvarSenha = document.getElementById('btn-salvar-senha');
const errorModal = document.getElementById('error-message-modal');

const API_URL = 'https://backend-g-rh.onrender.com';

// 1. VERIFICAÇÃO DE SEGURANÇA
// Se já tem token válido, pula o login
const usuarioLogado = Sessao.ler();
if (usuarioLogado && usuarioLogado.cpf) {
    window.location.href = 'index.html';
}

// 2. LOGIN
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cpf = cpfInput.value.trim();
    const senha = senhaInput.value.trim();

    loginButton.disabled = true;
    loginButton.textContent = 'Acessando...';
    errorMessage.textContent = '';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf, senha })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            salvarSessaoEEentrar(data.usuario);
        } 
        else if (data.precisa_definir_senha) {
            abrirModalCriacaoSenha(cpf);
        } 
        else {
            throw new Error(data.mensagem || 'Credenciais inválidas.');
        }

    } catch (error) {
        console.error('Erro:', error);
        errorMessage.textContent = error.message || 'Erro de conexão.';
    } finally {
        if (!modalNovaSenha.style.display || modalNovaSenha.style.display === 'none') {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    }
});

// 3. CRIAR SENHA
formCriarSenha.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpf = cpfHiddenInput.value;
    const telefone = telefoneInput.value.trim();
    const novaSenha = novaSenhaInput.value.trim();
    const confirmarSenha = confirmarSenhaInput.value.trim();

    if (novaSenha !== confirmarSenha) {
        errorModal.textContent = "As senhas não coincidem."; return;
    }
    if (novaSenha.length < 6) {
        errorModal.textContent = "Mínimo 6 caracteres."; return;
    }
    
    btnSalvarSenha.disabled = true;
    btnSalvarSenha.textContent = "Criando...";

    try {
        const response = await fetch(`${API_URL}/definir-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf, novaSenha, telefoneValidacao: telefone })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            alert("Sucesso! Entrando...");
            salvarSessaoEEentrar(data.usuario);
        } else {
            throw new Error(data.mensagem || 'Erro ao criar senha.');
        }
    } catch (error) {
        errorModal.textContent = error.message;
        btnSalvarSenha.disabled = false;
        btnSalvarSenha.textContent = "Confirmar e Criar";
    }
});

function abrirModalCriacaoSenha(cpf) {
    cpfHiddenInput.value = cpf;
    modalNovaSenha.style.display = 'flex';
    loginButton.textContent = 'Aguardando...';
}

function salvarSessaoEEentrar(usuario) {
    // VERIFICAÇÃO DE BLOQUEIO (DESLIGAR)
    if (usuario.CLASSIFICACAO === 'DESLIGAR') {
        alert('Seu acesso está suspenso. Entre em contato com o RH.');
        return;
    }

    // Limpeza CPF
    let cpfLimpo = String(usuario.cpf).replace(/\D/g, '');
    while (cpfLimpo.length < 11) cpfLimpo = "0" + cpfLimpo;
    usuario.cpf = cpfLimpo;

    // Salva sessão criptografada
    Sessao.salvar(usuario);
    
    // Redireciona imediatamente
    window.location.replace('index.html');
}

window.onclick = function(event) {
    if (event.target == modalNovaSenha) { }
}