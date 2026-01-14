I will implement the restriction for users with "Ciclo de Gente" status as "Desligar" in both the login process and the main application initialization.

**Plan:**

1.  **Modify `frontend_G_RH/script.js`**:
    *   Add a validation check immediately after retrieving the session (`Sessao.ler()`).
    *   Check if `usuarioLogado.CLASSIFICACAO` equals 'DESLIGAR' (case-insensitive).
    *   If true, alert the user, clear the session using `Sessao.limpar()`, and redirect to the login page.

2.  **Modify `frontend_G_RH/login.js`**:
    *   Update the `salvarSessaoEEentrar` function.
    *   Before saving the session, check if `usuario.CLASSIFICACAO` equals 'DESLIGAR'.
    *   If true, display an error message (e.g., "Acesso negado: Colaborador desligado.") and prevent the login/redirection.

This ensures that restricted users cannot log in, and if they somehow have an active session (or if the status changes while logged in), they will be blocked upon refreshing or accessing the dashboard.