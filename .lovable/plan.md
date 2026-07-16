# Reconectar MCP do Soma

## Objetivo
Registrar novamente o provider **soma** no MCP genérico, apontando para
`https://erxhxmetrvkigjwxchbj.supabase.co/functions/v1/mcp`.

## Alterações

### 1. `src/lib/mcp.server.ts`
Adicionar novamente o bloco `soma` em `MCP_PROVIDERS` (mesmo padrão dos demais providers Supabase):

- `authorizationServer`, `authorizationEndpoint`, `tokenEndpoint`, `registrationEndpoint` → base `https://erxhxmetrvkigjwxchbj.supabase.co/auth/v1/...`
- `resource` → `https://erxhxmetrvkigjwxchbj.supabase.co/functions/v1/mcp`
- `scope: "openid profile email"` (Soma já suporta OIDC — mesmo padrão de DeePersona/LeKPIs)
- `apiKeyEnv: "SOMA_SUPABASE_ANON_KEY"` (secret já existe? — se não, pedimos abaixo)

### 2. `src/lib/aeiou-modules.ts`
No card do Soma no módulo O:
- Voltar `status` para `"ready"`
- Adicionar `mcpProvider: "soma"`

### 3. Secret
Verificar se `SOMA_SUPABASE_ANON_KEY` já está salvo. Se não estiver, pedir com `add_secret` (mesmo formato dos outros: JWT ou `sb_publishable_...`).

## Verificação
Configurações → MCP → tile "Soma" → conectar → deve completar OAuth e listar tools.
