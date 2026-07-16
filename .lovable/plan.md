# Análise de Campanhas — Integração MCP LeKPIs

Nova funcionalidade dentro do Marketing OS que consome o MCP Server do LeKPIs (já configurado em `mcp.server.ts` como provider `lekpis`) para gerar análises de campanhas com layout pré-definido, sem prompts do usuário.

## Fluxo do usuário

1. Entra em `/analise-campanhas` (novo item no menu, dentro de "LeKPIs").
2. Passo 1: seleciona **cliente** (dropdown carregado do MCP LeKPIs).
3. Passo 2: seleciona **uma ou várias campanhas** (multi-select, dependente do cliente).
4. Passo 3: escolhe **data inicial e final** (shadcn date range picker).
5. Clica **"Gerar análise"** → estado de loading com skeleton dos cards.
6. Recebe resposta estruturada → layout é montado automaticamente.
7. Em erro: mensagem clara + botão "Tentar novamente" mantendo filtros.

## Camadas (modular, extensível)

```text
UI (route)                     src/routes/_authenticated/analise-campanhas.tsx
  │
  ▼
Hooks/State (React Query)      src/features/campaign-analysis/hooks.ts
  │
  ▼
Server Functions (RPC)         src/lib/campaign-analysis.functions.ts
  │  (requireSupabaseAuth)
  ▼
MCP Client Service             src/lib/mcp-client/                (NOVO — genérico)
  ├─ index.ts                  callTool(providerSlug, toolName, args, opts)
  ├─ transport.ts              usa mcpCallTool + credentials do usuário
  ├─ errors.ts                 McpTimeoutError, McpToolError, McpValidationError
  └─ providers/lekpis.ts       schemas Zod + wrappers tipados por tool
```

O `mcp-client` é independente de qualquer feature. Adicionar novo provider = novo arquivo em `providers/`. Adicionar nova análise = nova feature consumindo o client.

## MCP Client (serviço isolado)

`src/lib/mcp-client/index.ts` expõe:

- `getMcpCredentials(userId, providerSlug)` — lê `mcp_connections`, valida `status='ready'`, retorna `{ resource, accessToken }`.
- `callMcpTool<TIn, TOut>({ provider, tool, args, inputSchema, outputSchema, timeoutMs = 45000, retries = 1 })`:
  - valida input com Zod;
  - chama `mcpCallTool` (já existente em `mcp.server.ts`);
  - envolve em `Promise.race` com timeout;
  - retry apenas em erro de rede/timeout (não em erro semântico);
  - parseia `content[0].text` como JSON e valida com `outputSchema`;
  - erros tipados: `McpTimeoutError | McpToolError | McpValidationError | McpAuthError`.

`providers/lekpis.ts` expõe wrappers tipados: `listClients()`, `listCampaigns(clientId)`, `runCampaignAnalysis({ clientId, campaignIds, startDate, endDate, timezone })`. Cada um com schemas Zod de entrada/saída — se o LeKPIs responder fora do schema, a UI recebe `McpValidationError` (não monta cards a partir de texto livre).

## Server Functions

`src/lib/campaign-analysis.functions.ts`:

- `lekpisListClients()` — GET, `requireSupabaseAuth`.
- `lekpisListCampaigns({ clientId })` — POST, `requireSupabaseAuth`.
- `runCampaignAnalysis({ clientId, campaignIds, startDate, endDate, timezone })` — POST, `requireSupabaseAuth`, timeout 60s, retorna `AnalysisReport` validado.

Todas leem credenciais via `mcp-client`. Se o usuário não tiver o LeKPIs conectado, retornam erro tipado `{ code: 'MCP_NOT_CONNECTED' }` → UI mostra CTA "Conectar LeKPIs" apontando para `/dashboard`.

## Contrato de resposta (AnalysisReport)

JSON estruturado, validado por Zod antes de renderizar:

```ts
{
  generatedAt: string,           // ISO
  period: { start, end, timezone, previousStart, previousEnd },
  client: { id, name },
  campaigns: [{ id, name }],
  kpis: [{ key, label, value, unit, delta, deltaPct, direction }],
  timeseries: [{ metric, points: [{ date, value, previousValue }] }],
  topCampaigns: [{ id, name, metric, value, deltaPct }],
  attentionPoints: [{ severity, title, description, campaignId? }],
  executiveSummary: string,      // parágrafo curto pronto (não é prompt)
  recommendations: [{ title, description, priority }],
}
```

Se o MCP do LeKPIs ainda não expõe uma tool única `run_campaign_analysis` com essa forma, o wrapper `providers/lekpis.ts` orquestra chamadas às tools disponíveis (métricas + série temporal + comparação) e consolida no schema acima. Descoberta das tools reais será feita na fase de implementação via `listMcpTools` — o schema-alvo acima é o contrato que a UI consome.

## UI

Rota `src/routes/_authenticated/analise-campanhas.tsx`:

- Componentes em `src/features/campaign-analysis/components/`:
  - `AnalysisFilters` (client select, campaign multi-select, date range, botão).
  - `AnalysisLoading` (skeletons dos cards).
  - `AnalysisError` (mensagem + "Tentar novamente" — filtros ficam em estado da rota, nunca são perdidos).
  - `AnalysisReport` composto por: `KpiCards`, `PeriodComparison`, `MetricsEvolution` (recharts), `TopCampaigns`, `AttentionPoints`, `ExecutiveSummary`, `Recommendations`, `LastUpdatedFooter`.
- Estado dos filtros em `useState` local + `useMutation` para a geração; React Query cacheia clientes/campanhas por `queryKey`.
- Botão desabilitado até cliente + ≥1 campanha + range válido.
- `Intl.DateTimeFormat().resolvedOptions().timeZone` para fuso.

## Item de menu

Adicionar entrada "Análise de Campanhas" no `app-shell.tsx` sob a seção LeKPIs, apontando para `/analise-campanhas`.

## Tratamento de erros (uniforme)

| Situação | UI |
|---|---|
| LeKPIs não conectado | Card com CTA "Conectar LeKPIs" |
| Timeout (>60s) | Erro "A análise demorou mais que o esperado" + Retry |
| Erro de tool MCP | Mensagem do servidor + Retry |
| Resposta fora do schema | "Recebemos dados inesperados do LeKPIs" + Retry, log server-side |
| Rede | "Sem conexão" + Retry |

Retry re-executa apenas `runCampaignAnalysis` mantendo os filtros do state.

## Arquivos

**Novos**
- `src/lib/mcp-client/index.ts`, `transport.ts`, `errors.ts`, `providers/lekpis.ts`
- `src/lib/campaign-analysis.functions.ts`
- `src/routes/_authenticated/analise-campanhas.tsx`
- `src/features/campaign-analysis/{hooks.ts, schemas.ts, components/*.tsx}`

**Editados**
- `src/components/app-shell.tsx` (novo item de menu)

**Sem mudanças**
- `mcp.server.ts`, `mcp.functions.ts`, `mcp-tools.server.ts` (orquestrador continua funcionando)

## Fora deste escopo

- Prompts/chat do orquestrador Gemini (feature separada).
- Persistência de análises anteriores (pode virar tabela `campaign_analyses` numa próxima fatia).
- Outros providers MCP para análise — a arquitetura já suporta, mas só LeKPIs entra agora.

## Pergunta única antes de implementar

O LeKPIs MCP hoje já expõe tools no formato `list_clients` / `list_campaigns` / uma tool de análise consolidada, ou preciso que o wrapper `providers/lekpis.ts` combine várias tools atômicas (métricas, série temporal, comparação período anterior) para montar o `AnalysisReport`? Se não souber, sigo com descoberta via `listMcpTools` na implementação e adapto o wrapper — sem mudar o contrato que a UI consome.
