# Integrar MCP do LeKPIs

Espelha exatamente a integração do DeePersona já existente, reaproveitando toda a infra de OAuth 2.1 + DCR + PKCE + proxy de tools (`src/lib/mcp.server.ts`, `src/lib/mcp.functions.ts`, `src/routes/api/mcp/callback.ts`, `mcp_connections` / `mcp_oauth_states`, `<McpOAuthPanel />`, `<McpResourceExplorer />`).

## 1. Registrar o provider

Em `src/lib/mcp.server.ts`, adicionar entrada `lekpis` em `MCP_PROVIDERS`, derivando os endpoints do host informado pelo usuário (mesmo padrão Supabase OAuth do DeePersona):

```ts
lekpis: {
  slug: "lekpis",
  name: "LeKPIs",
  authorizationServer: "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1",
  resource:            "https://phsqbgdjsohmjjoeeqqc.supabase.co/functions/v1/mcp",
  authorizationEndpoint: "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/authorize",
  tokenEndpoint:         "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/token",
  registrationEndpoint:  "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/register",
  scope: "openid profile email",
},
```

Nenhuma mudança de banco é necessária — as tabelas `mcp_connections` e `mcp_oauth_states` já são multi-provider (chave `user_id + provider`).

## 2. UI na rota /lekpis

Em `src/routes/_authenticated/lekpis.tsx`, adicionar uma seção "Integração MCP" reutilizando os componentes existentes:

- `<McpOAuthPanel provider="lekpis" providerName="LeKPIs" />` — botão Conectar/Desconectar, status da conexão, abre popup para `startMcpAuth`.
- `<McpResourceExplorer provider="lekpis" />` — lista tools via `listMcpTools` e permite invocar via `callMcpTool`.

Manter identidade visual atual da /lekpis; a seção MCP entra como card na página.

## 3. Sem outras mudanças

- Callback `/api/mcp/callback` já é genérico (usa `pending.provider`) → volta para `/lekpis` automaticamente via `return_to`.
- `startMcpAuth`, `listMcpTools`, `callMcpTool`, `disconnectMcp` já aceitam `provider` como parâmetro.
- Nenhum novo secret; nenhum novo edge function.

## Detalhes técnicos

Arquivos alterados:
- `src/lib/mcp.server.ts` — nova entrada no `MCP_PROVIDERS`.
- `src/routes/_authenticated/lekpis.tsx` — seção MCP no fim da página.

Pré-requisito no lado do LeKPIs: o projeto Supabase `phsqbgdjsohmjjoeeqqc` precisa ter o OAuth 2.1 authorization server + DCR habilitados (mesma configuração do DeePersona), e a rota de consent (`/.lovable/oauth/consent`) publicada. Se a autorização retornar 404 ou "feature disabled", é sinal de que essa configuração ainda não está ativa lá.
