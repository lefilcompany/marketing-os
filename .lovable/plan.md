# Conectar MonitorNews via MCP

Replicar o padrão do `lekpis` para o MonitorNews, sem criar rota nova. A conexão será testada pelo painel MCP genérico existente.

## Alterações

### 1. `src/lib/mcp.server.ts`
Adicionar entrada `monitornews` em `MCP_PROVIDERS`:

- `authorizationServer`: `https://dvuaudcncwzferlagmck.supabase.co/auth/v1`
- `resource`: `https://dvuaudcncwzferlagmck.supabase.co/functions/v1/mcp`
- `authorizationEndpoint` / `tokenEndpoint` / `registrationEndpoint`: derivados do host acima (`/oauth/authorize`, `/oauth/token`, `/oauth/clients/register`)
- `scope`: `openid profile email`
- `apiKeyEnv`: `MONITORNEWS_SUPABASE_ANON_KEY`

### 2. `src/lib/aeiou-modules.ts`
No item `monitornews` (módulo A · Ambiente):
- `status`: `coming_soon` → `ready`
- adicionar `mcpProvider: "monitornews"`

## Pendência de secret

O secret `MONITORNEWS_SUPABASE_ANON_KEY` ainda **não existe** no projeto (só temos `LEKPIS_SUPABASE_ANON_KEY`). Sem ele, o `apikey` header vai como `undefined` e as chamadas OAuth (register/authorize/token) falham com 401.

Vou pedir esse secret ao entrar em build mode via `secrets--add_secret`, informando que é a anon key pública do projeto Supabase `dvuaudcncwzferlagmck`.

## Verificação

Depois de aplicado + secret preenchido: abrir o painel MCP em Configurações, conectar `MonitorNews`, e conferir que `tools/list` retorna as tools expostas pelo MCP do MonitorNews.
