## Adicionar SOMA ao MCP

Você reiniciou o MCP do SOMA em `https://erxhxmetrvkigjwxchbj.supabase.co/functions/v1/mcp`. Hoje o SOMA aparece no módulo "O" como `status: "coming_soon"` e sem `mcpProvider`, então o card não tenta conectar.

### Mudanças

1. **`src/lib/mcp.server.ts`** — adicionar entrada `soma` em `MCP_PROVIDERS`:
   - `authorizationServer`: `https://erxhxmetrvkigjwxchbj.supabase.co/auth/v1`
   - `resource`: `https://erxhxmetrvkigjwxchbj.supabase.co/functions/v1/mcp`
   - `authorizationEndpoint` / `tokenEndpoint` / `registrationEndpoint`: padrão Supabase OAuth (`/auth/v1/oauth/...`)
   - `scope`: `"profile email"` (mesmo padrão de `creator` / `monitornews`)
   - `apiKeyEnv`: `"SOMA_SUPABASE_ANON_KEY"`

2. **`src/lib/aeiou-modules.ts`** — no tool `soma`:
   - remover `status: "coming_soon"`
   - adicionar `mcpProvider: "soma"`
   Assim o card passa a exibir botão Conectar / lista de ferramentas como os demais.

3. **Novo secret** `SOMA_SUPABASE_ANON_KEY` — necessário para o Data API do projeto SOMA aceitar as chamadas OAuth (DCR, token exchange, refresh) e o próprio endpoint `/functions/v1/mcp`. Vou pedir via `add_secret` quando entrarmos em build mode. É a anon/publishable key do projeto Supabase do SOMA (dashboard do SOMA → API keys → anon public).

### Fora do escopo

- Nenhuma alteração em `mcp.functions.ts`, no callback OAuth, no painel de conexões ou no card de status. Toda a máquina existente já lida com qualquer provider registrado.
- Nada muda no Creator, DeePersona, LeKPIs ou MonitorNews.

### Depois de implementar

Você vai em Configurações → MCP, clica em Conectar no SOMA, faz login no Supabase Auth do SOMA e o card do módulo O passa a listar as tools reais.