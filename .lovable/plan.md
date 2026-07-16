## Objetivo

Reintroduzir apenas a entrada `lekpis` em `MCP_PROVIDERS`, apontando para o novo servidor MCP publicado do LeKPIs, e testar conexão + tool `ping` pelo painel MCP genérico existente. Sem rota `/analise-campanhas`, sem tools específicas.

## Alterações

### 1. `src/lib/mcp.server.ts`
Adicionar `lekpis` ao `MCP_PROVIDERS` (o project ref é `phsqbgdjsohmjjoeeqqc`):

```ts
lekpis: {
  slug: "lekpis",
  name: "LeKPIs",
  authorizationServer: "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1",
  resource: "https://phsqbgdjsohmjjoeeqqc.supabase.co/functions/v1/mcp",
  authorizationEndpoint: "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/authorize",
  tokenEndpoint:         "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/token",
  registrationEndpoint:  "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/clients/register",
  scope: "openid profile email",
  apiKeyEnv: "LEKPIS_SUPABASE_ANON_KEY",
},
```

Uso do secret `LEKPIS_SUPABASE_ANON_KEY` já existente no projeto (sem `apiKeyFallback` — se você quiser fallback público como nos outros providers, me passe o anon key JWT do LeKPIs e eu adiciono).

### 2. `src/lib/aeiou-modules.ts`
Reverter o módulo LeKPIs para `status: "ready"` e `mcpProvider: "lekpis"`, para que o painel de MCP em `/configuracoes` (ou onde estiver o generic `McpOAuthPanel`) volte a listá-lo.

## Sem alteração
- Nenhuma nova rota criada. `/analise-campanhas` permanece removida.
- Nenhuma tool nova; a discovery via `tools/list` retornará `ping` diretamente do MCP do LeKPIs.
- Nenhum arquivo em `src/lib/mcp-client/providers/` recriado.
- Nada de mudança em `src/components/app-shell.tsx`.

## Verificação
1. Build ok.
2. Abrir a UI onde `<McpOAuthPanel provider="lekpis" />` é renderizado, clicar **Conectar**, autorizar via OAuth do Supabase do LeKPIs.
3. Após retorno, `tools/list` deve mostrar 1 tool `ping`.
4. Executar `ping` sem argumentos → resposta com `ok: true`, `authenticated: true`, `userId`, `timestamp`.

## Pendências para você confirmar
- Confirmar que o secret `LEKPIS_SUPABASE_ANON_KEY` no ambiente atual corresponde ao projeto `phsqbgdjsohmjjoeeqqc` (o anterior era de outro ref). Se não, atualize via `secrets--update_secret` antes do teste — senão o OAuth (`register`/`authorize`) falha com 401 no header `apikey`.
