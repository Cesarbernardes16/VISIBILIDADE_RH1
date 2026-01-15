## Diagnóstico (o que está quebrando hoje)
- Seu backend valida o token em `Authorization: Bearer <token>` no middleware de JWT.
- O backend retorna o token dentro de `usuario.token` no `/login`, mas o frontend tenta salvar `data.token` (que não existe). Resultado: o `accessToken` não vai para o `sessionStorage` e as rotas protegidas retornam 401/403.
- No fluxo de “definir senha”, o backend não retorna token; então o frontend nunca terá um JWT válido sem fazer login.

## Mudanças no Frontend (para “validar” e conseguir acessar)
- Ajustar o `login.js` para salvar o token correto:
  - Trocar `salvarSessaoEEentrar(data.usuario, data.token)` por `salvarSessaoEEentrar(data.usuario, data.usuario.token)`.
- Ajustar o fluxo de `definir-senha`:
  - Após sucesso, chamar o endpoint `/login` automaticamente (com cpf + novaSenha) para obter o token e então salvar a sessão.
- Reativar o tratamento automático de 401/403 no `utils.js` (função `handleAuthError`) e aplicar nas chamadas `fetch` do `script.js` para redirecionar pro login quando a sessão expirar.

## Mudanças no Backend (opcional, mas melhora integração)
- Padronizar a resposta do `/login` para também retornar `token` na raiz do JSON (mantendo `usuario.token` por compatibilidade), assim o frontend pode ler dos dois jeitos.
- Corrigir o export do middleware para o padrão CommonJS (`module.exports = autenticarUsuario`) e usar `app.use(authMiddleware)` (evita confusão com `modules`).
- Gerar JWT com payload útil (ex.: `cpf`, `perfil`) e com expiração (`expiresIn`), para a validação ter sentido real.

## Verificação (depois das alterações)
- Fazer login e conferir no DevTools que `sessionStorage.accessToken` existe.
- Chamar uma rota protegida (`/colaboradores`, `/filtros`) e confirmar 200.
- Remover o token do storage e confirmar que as chamadas voltam a 401/403 e o frontend redireciona para `login.html`.
