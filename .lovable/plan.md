# Integrar MCP do Creator

## Mudanças

1. **`src/lib/mcp.server.ts`** — adicionar entrada `creator` em `MCP_PROVIDERS`:
   - `resource`: `https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp`
   - `authorizationServer` / endpoints OAuth em `https://afxwqkrneraatgovhpkb.supabase.co/auth/v1` (authorize, token, register)
   - `scope`: `openid profile email`
   - `apiKeyEnv`: `CREATOR_SUPABASE_ANON_KEY`

2. **`src/lib/aeiou-modules.ts`** — na ferramenta `creator` (módulo I):
   - adicionar `mcpProvider: "creator"` (hoje está sem)
   - manter `status: "ready"` e `brandable: true`

3. **Secret** — solicitar `CREATOR_SUPABASE_ANON_KEY` via `add_secret` (padrão `^(eyJ|sb_publishable_)`), mesmo fluxo usado no MonitorNews.

## Depois de aprovado

Testar em Configurações → MCP conectando na tile do Creator e verificando descoberta de tools.
