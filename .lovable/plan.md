# Integração LeKPIs no Marketing OS

## 1. Arquitetura encontrada

**Infra MCP genérica (mantém, evolui):**
- `src/lib/mcp.server.ts` — providers, PKCE, DCR, exchange/refresh, cliente Streamable HTTP (initialize/tools.list/tools.call), parser SSE+JSON. LeKPIs já registrado corretamente apontando para `phsqbgdjsohmjjoeeqqc.supabase.co`.
- `src/lib/mcp.functions.ts` — server fns: `startMcpAuth`, `getMcpConnection`, `listMcpTools`, `callMcpTool`, `disconnectMcp`. Autenticadas via `requireSupabaseAuth`; `loadAccessToken` cuida de refresh transparente.
- `src/routes/api/mcp/callback.ts` — callback público único; consome `state`, troca code por token, upsert em `mcp_connections`, `postMessage` + `window.close` para popups.
- Componentes: `mcp-oauth-panel`, `mcp-status-card`, `mcp-resource-explorer`, `module-platform-shell`.
- Tabelas: `mcp_connections (unique user_id,provider)` e `mcp_oauth_states (pk state)` — RLS ativo, sem `workspace_id`, tokens em texto puro, state sem `expires_at`.
- Workspace: `src/lib/workspace-context.tsx` expõe `currentOrgId` (mapeia `organization_members`).
- DeePersona funciona sobre a mesma infra — não pode quebrar.
- `/lekpis` hoje é só um placeholder.

**Problemas/riscos identificados**
1. `mcp_connections`/`mcp_oauth_states` não têm `workspace_id` nem unique por workspace — conexão vaza entre orgs.
2. `access_token`/`refresh_token` em texto puro no Postgres.
3. `mcp_oauth_states` sem `expires_at` nem TTL — replay/limpeza dependem só do delete pós-uso.
4. Callback tem link "Voltar" fixo para `/deepersona` em erro; usa `pending.return_to` só no sucesso; não valida `return_to` (open-redirect possível); expõe `stateErr.message`/`upErr.message` no HTML.
5. `return_to` aceita qualquer string vinda do cliente que chamou `startMcpAuth`.
6. Toda tentativa faz DCR novo (aceitável para clientes públicos, mas gera lixo).
7. Sem TTL/rate limit em `startMcpAuth`.
8. `callMcpTool` faz `initialize` a cada chamada (aceitável, mas caro — não é problema de correção).

## 2. Contrato real das tools LeKPIs (a validar via `tools/list`)

| Tool | Uso |
|---|---|
| `connect_provider` | Devolve URL do broker para Meta/Google. Args descobertos do `inputSchema`. |
| `list_available_accounts` | Contas do provider após retorno OAuth. |
| `select_account` | Vincula conta ao workspace LeKPIs. Aridade descoberta do schema (single/multi). |
| `sync_metrics` | Enfileira sync; pode retornar `job_id`. |
| `get_dashboard` | KPIs consolidados: `spend, impressions, clicks, CTR, CPC`. |
| `get_metric_series` | Série temporal diária. |
| `update_metric_target` | Cria/atualiza meta. |

Tools **não usadas**: `get_onboarding_status`, `list_data_sources`, `set_monitored_accounts`, `get_sync_status`, `disconnect_data_source`. Se aparecerem em `tools/list`, ativação por capability detection.

## 3. Arquivos a alterar/criar

**Migrations (Wave 1)**
- Nova migration:
  - `mcp_connections`: adiciona `workspace_id uuid NULL` (nullable para preservar DeePersona), `access_token_ciphertext bytea`, `refresh_token_ciphertext bytea`, `token_encryption_version int`. Drop unique `(user_id, provider)`, cria unique `(user_id, coalesce(workspace_id,'00000000-...'::uuid), provider)` via índice único funcional.
  - `mcp_oauth_states`: adiciona `workspace_id uuid`, `expires_at timestamptz NOT NULL DEFAULT now()+interval '10 min'`.
  - Policies RLS atualizadas: usuário só vê linhas cujo `workspace_id` está entre suas orgs (via `is_org_member`) OU `workspace_id IS NULL` (legado DeePersona) e `user_id = auth.uid()`.
  - Backfill: manter linhas existentes como `workspace_id NULL`.

**Camada de criptografia (Wave 1)**
- `src/lib/mcp-crypto.server.ts` — AES-GCM com `MCP_TOKEN_ENCRYPTION_KEY` (Web Crypto). `encrypt(plaintext) -> Uint8Array` (nonce+ciphertext+tag), `decrypt(bytes)`. Versionado.
- Secret: `MCP_TOKEN_ENCRYPTION_KEY` (32 bytes base64) — a adicionar via `secrets.add_secret`.

**Núcleo MCP evoluído (Wave 2)**
- `src/lib/mcp.server.ts` — sem mudança de contrato externo. Tokens permanecem string em memória; persistência passa por crypto helpers.
- `src/lib/mcp.functions.ts`:
  - Todas as fns aceitam/derivam `workspaceId` a partir do body (validado contra `is_org_member`); consultas passam a filtrar por `(user_id, workspace_id, provider)`.
  - `startMcpAuth`: valida `returnTo` (mesma origem + allowlist de paths internos, default `/${provider}`), grava `workspace_id`, `expires_at` (10min).
  - `loadAccessToken`: descriptografa; ao dar refresh, re-criptografa.
  - `getMcpConnection`/`listMcpTools`/`callMcpTool`/`disconnectMcp`: filtram por workspace.
- `src/routes/api/mcp/callback.ts`:
  - Rejeita state expirado; delete atômico via `DELETE ... RETURNING`.
  - Escapa todo HTML (helper `esc`).
  - Não expõe mensagens internas; loga server-side com request id.
  - Redirect final: `${returnTo}?mcp=connected|cancelled|error` com `returnTo` validado.
  - Links "Voltar" derivados de `pending.provider` (fallback `/`).
  - Criptografa tokens antes do upsert.

**Adapter tipado LeKPIs (Wave 3)**
- `src/lib/lekpis-mcp.types.ts` — schemas Zod para `DashboardResponse`, `AccountList`, `MetricSeries`, `MetricTargetUpdate`, `ConnectProviderResponse`, `SyncMetricsResponse`.
- `src/lib/lekpis-mcp.utils.ts` — `unwrapMcpToolResult(result)`: prioriza `structuredContent`, tenta objeto direto, `content[].text` JSON, fallback texto; detecta `isError`. Sem `eval`.
- `src/lib/lekpis-mcp.functions.ts` — server fns `connectProvider`, `listAvailableAccounts`, `selectAccount`, `syncMetrics`, `getDashboard`, `getMetricSeries`, `updateMetricTarget`. Cada uma:
  - `requireSupabaseAuth` + `workspaceId`;
  - chama `callMcpTool` internamente com `provider: "lekpis"`;
  - passa argumentos pelo `inputSchema` descoberto e valida saída via Zod;
  - server-side logging com request id.
- `src/lib/lekpis-mcp.registry.ts` — registry de métricas (`metricKey → {label, category, format, unit, higherIsBetter}`) com apenas spend/impressions/clicks/CTR/CPC v1; demais categorias ficam "Em breve".

**UI (Waves 4–7)**
- `src/routes/_authenticated/lekpis.tsx` — coordena; lê `?mcp=connected|cancelled|error` e mostra toast.
- `src/components/lekpis/`:
  - `LekpisPage.tsx`, `LekpisHeader.tsx`
  - `LekpisMcpConnection.tsx` — banner + botão Conectar (chama `startMcpAuth({ provider: 'lekpis', returnTo: '/lekpis' })`, `window.location = authorizeUrl`).
  - `LekpisOnboarding.tsx` + `LekpisOnboardingSteps.tsx` — estados derivados (`mcp_disconnected → ready`).
  - `ProviderConnectionCard.tsx` (Meta/Google), `ProviderAccountsDialog.tsx`, `AccountSelector.tsx` (radio vs checkbox conforme schema real).
  - `SyncMetricsDialog.tsx`, `SyncRequestedState.tsx`.
  - `MetricCategoryNavigation.tsx`, `MetricCategoryCard.tsx`, `MetricGrid.tsx`, `MetricCard.tsx`.
  - `MetricDetailDrawer.tsx` (gráfico via `src/components/ui/chart.tsx`).
  - `MetricTargetDialog.tsx`.
  - `LekpisEmptyState.tsx`, `LekpisErrorState.tsx`, `LekpisConnectionExpired.tsx`.
- `src/lib/modules.ts` — LeKPIs: `platformUrl: https://pla.lekpis.lefil.com.br`, `suggestedMcpUrl` = URL canônica Supabase; `ModulePlatformShell` com `hideMcpPanel`.

**Estado/cache**
- TanStack Query (já usado): keys `["lekpis","tools", workspaceId]`, `["lekpis","dashboard", workspaceId, period]`, `["lekpis","accounts", workspaceId, provider]`, `["lekpis","series", metric, period]`. Invalidação em connect/select/sync/updateTarget/disconnect.

**Segurança / observabilidade**
- Nenhum token em resposta de server fn. `mcp-oauth-panel` deixa de mostrar dados sensíveis quando presente para LeKPIs (`hideMcpPanel`).
- Logs `console.info` server-side com `{provider, userId, workspaceId, tool, durationMs, ok, requestId}`; nunca token/code/verifier.

## 4. Waves

**Wave 1 — Fundamentos**
- Migration workspace + crypto + expires_at + policies.
- `mcp-crypto.server.ts`, secret `MCP_TOKEN_ENCRYPTION_KEY`.
- Adaptar `mcp.functions.ts`/`callback.ts` para novos campos, mantendo DeePersona (workspace null).
- Sanidade: DeePersona conecta/lista tools/desconecta.

**Wave 2 — OAuth LeKPIs + callback seguro**
- `returnTo` validado (allowlist `/lekpis`, `/deepersona`, `/soma`, `/creator`).
- Callback com HTML escapado + redirect com `?mcp=…`.
- `/lekpis` mostra `LekpisMcpConnection`; conecta → salva `mcp_connections` com workspace.

**Wave 3 — Tools + adapter**
- `listMcpTools` verifica presença das 7 tools; falta ⇒ `LekpisErrorState` "Integração incompatível".
- `lekpis-mcp.functions.ts` cobre as 7 tools; `unwrapMcpToolResult` + Zod.

**Wave 4 — Providers Meta/Google**
- Cards; `connectProvider` → valida URL (host allowlist `phsqbgdjsohmjjoeeqqc.supabase.co`, `pla.lekpis.lefil.com.br`, protocolo `https`); `window.location`.
- `?provider=connected` no retorno dispara `listAvailableAccounts`.
- `ProviderAccountsDialog` + `select_account` (single/multi conforme schema).

**Wave 5 — Sync**
- `SyncMetricsDialog` (7d/30d/mês atual/anterior/custom, YYYY-MM-DD, validação de intervalo).
- `SyncRequestedState`; guarda `job_id` em metadata local (não sensível). Botões "Verificar dados" / "Atualizar" chamam `getDashboard`.

**Wave 6 — Dashboard**
- `MetricCategoryNavigation` com 6 categorias; v1 popula só Alcance & Marca e Performance & Aquisição; demais "Em breve".
- Formatação por registry: moeda (currency retornado, fallback BRL só quando a conta é BRL), inteiro com separador, %, CPC monetário.
- Distinguir `null/undefined` ⇒ `"—"`, valor zero ⇒ `"0"/"0%"/"R$ 0,00"`.

**Wave 7 — Detalhe + metas**
- `MetricDetailDrawer` chama `get_metric_series`, plota via `chart.tsx`.
- `MetricTargetDialog` valida número BR, envia via `update_metric_target`, invalida cache.

**Wave 8 — Erros/Logs/Testes**
- Mensagens amigáveis por caso (conforme lista). Nada de stack/JWT/code no HTML.
- Testes unitários: `unwrapMcpToolResult`, `mcp-crypto`, validação `returnTo`/broker URL, formatação de métricas, distinção null vs 0.
- Teste manual de integração DeePersona (não pode regredir).

## 5. Não fazer

- Não criar segundo callback/rota OAuth.
- Não codificar client_id fixo (mantém DCR).
- Não persistir tokens Meta/Google no Marketing OS.
- Não chamar API Meta/Google direto.
- Não usar `get_sync_status`/`get_onboarding_status`.
- Não mostrar dados simulados no dashboard.
- Não quebrar DeePersona.

## 6. Detalhes técnicos-chave

- **Crypto**: AES-GCM 256, nonce 12B aleatório por registro, salva `nonce||ciphertext||tag` em `bytea`. Chave lida uma vez por processo, cacheada.
- **Workspace**: server fns exigem `workspaceId` no input; valida via `context.supabase.rpc('is_org_member', {_user_id: userId, _org_id: workspaceId})`. Sem workspace ⇒ erro amigável "Selecione uma empresa".
- **`returnTo` validado**: `new URL(returnTo, origin)` deve ter mesma origem e pathname em allowlist regex `^/(lekpis|deepersona|soma|creator)(/|$|\?)`.
- **Broker URL validation (Meta/Google)**: parse URL, `protocol === 'https:'`, hostname ∈ `{phsqbgdjsohmjjoeeqqc.supabase.co, pla.lekpis.lefil.com.br}`.
- **DCR reuso**: fora do escopo desta versão (aceitável ficar como está — cada conexão nova registra novo client público sem segredo).

Após aprovação, implemento em sequência (Wave 1 → 8), reportando arquivos/migrations/pendências ao fim de cada wave.
