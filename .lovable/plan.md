## Plano

Reverter em `src/lib/mcp.server.ts` (provider `creator`) o `authorizationServer`, `authorizationEndpoint`, `tokenEndpoint` e `registrationEndpoint` de `lcpmqnkorcsclmpfbizr` de volta para `afxwqkrneraatgovhpkb`. Isso alinha o issuer ao Supabase real da app do Creator (`pla.creator.lefil.com.br`), que é onde a tela `/.lovable/oauth/consent` faz `getAuthorizationDetails`.

Manter:
- `resource`: `https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp` (inalterado).
- `scope`: `openid profile email`.
- Sem `apiKeyEnv` (não é necessário).

### O que acontecerá após a mudança

1. **Funciona:** DCR → authorize → consent UI carrega ("Não foi possível carregar / authorization not found" some) → usuário aprova → token JWT é emitido por `afxw...`.
2. **Ainda vai falhar:** o `initialize` do MCP retorna `401 unauthorized`, porque o `oauth-protected-resource` do MCP do Creator declara `authorization_servers: ["https://lcpmqnkorcsclmpfbizr.supabase.co/auth/v1"]` — issuer diferente do token que o próprio Creator emite. O card vai mostrar 0 ferramentas com o erro real.

### Ação necessária do time do Creator

Enviar ao time do Creator o seguinte relato (é fix de 1 linha do lado deles):

> A edge function `mcp` do projeto `afxwqkrneraatgovhpkb` publica em `/.well-known/oauth-protected-resource`:
> ```
> "authorization_servers": ["https://lcpmqnkorcsclmpfbizr.supabase.co/auth/v1"]
> ```
> Mas o app do Creator (`pla.creator.lefil.com.br`) autentica usuários pelo Supabase `afxwqkrneraatgovhpkb.supabase.co` — a tela de consent em `/.lovable/oauth/consent` chama `getAuthorizationDetails` nesse projeto. Consequência: qualquer cliente MCP que respeite o metadata vai pedir token para `lcpm...`, mas o consent só existe em `afxw...`.
>
> **Fix:** trocar `authorization_servers` no `oauth-protected-resource` (e a lógica de verificação de JWT da edge function) para `https://afxwqkrneraatgovhpkb.supabase.co/auth/v1`. Ou, alternativamente, configurar OAuth 2.1 + consent em `lcpm...`.

### Passos

1. Editar `src/lib/mcp.server.ts` — provider `creator` volta todos os endpoints OAuth para `afxwqkrneraatgovhpkb.supabase.co/auth/v1`.
2. Instruir o usuário a **Remover conexão** e **Conectar Creator** de novo (a conexão salva referencia o `client_id` DCR emitido em `lcpm`).
3. Reportar ao Creator o texto acima.

Nenhuma outra alteração (`mcp.functions.ts`, card, migrations).
