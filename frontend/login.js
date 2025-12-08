const loginForm = document.getElementById('login-form');
const cpfInput = document.getElementById('cpf');
const senhaInput = document.getElementById('senha');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');

// URL do Backend
const API_URL = 'http://localhost:3000/api';

if (sessionStorage.getItem('usuarioLogado') === 'true') {
    window.location.href = 'index.html';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cpf = cpfInput.value.trim();
    const senha = senhaInput.value.trim();

    loginButton.disabled = true;
    loginButton.textContent = 'Verificando...';
    errorMessage.textContent = '';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf, senha })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            // Salva dados cruciais para o controle de acesso
            sessionStorage.setItem('usuarioLogado', 'true');
            sessionStorage.setItem('usuarioNome', data.usuario.nome);
            sessionStorage.setItem('usuarioPerfil', data.usuario.perfil); // 'admin' ou 'user'
            sessionStorage.setItem('usuarioCPF', data.usuario.cpf);       // CPF limpo
            
            window.location.href = 'index.html';
        } else {
            throw new Error(data.mensagem || 'Erro desconhecido');
        }

    } catch (error) {
        console.error('Erro:', error);
        errorMessage.textContent = error.message || 'Erro ao conectar. O servidor está ligado?';
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
});