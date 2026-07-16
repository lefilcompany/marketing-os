# Integração MCP Creator V4 — Conexão + Tela dedicada `/creator-mcp`

Provider `creator` já configurado em `src/lib/mcp.server.ts` apontando para `https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp`, com OAuth (authorize/token/DCR), refresh e ponte MCP prontos. Reutilizo toda a infra existente.

Observação: já existe `src/routes/_authenticated/creator.tsx` (página do módulo Creator antigo). Para não colidir, a nova tela vive em **`/creator-mcp`**.

## Escopo

1. **Conectar Creator** — via `McpOauthPanel` já montado no dashboard. Se o card do provider `creator` não estiver visível hoje, garantir que apareça (a lista lê `MCP_PROVIDERS`, então provavelmente já aparece; só verifico).

2. **Nova tela `/creator-mcp`** (`src/routes/_authenticated/creator-mcp.tsx`) — dedicada a listar e executar tools do Creator via UI, sem chat.

Layout:
- **Header**: título "Creator MCP" + badge de status (Conectado / Expirando / Desconectado). Botão "Conectar" / "Reconectar" (chama o mesmo fluxo OAuth que o painel do dashboard).
- **Sidebar esquerda** (~320px): lista de tools, com busca por nome/descrição. Cada item mostra `title`, `name`, badges (read-only / destructive) via `annotations`.
- **Painel direito**: ao selecionar uma tool:
  - Descrição + hints de anotação.
  - **Formulário auto-gerado** a partir do `inputSchema` (JSON Schema) da tool — campos: string (input/textarea), number, boolean (switch), enum (select), array/objeto (JSON textarea com validação). Required marcado. Fallback: editor JSON puro (Monaco-ish com textarea) para schemas complexos.
  - Botão "Executar" — se `destructiveHint`, exige confirmação (AlertDialog).
  - Painel de **Resultado**: JSON com syntax-highlight simples + botão copiar; se `content[].type === "text"`, renderiza texto legível também.
  - **Histórico da sessão** (últimas 10 chamadas em memória, não persistido): timestamp, tool, status, tempo.
- **Estados de erro**: 
  - Sem conexão → CTA "Conectar Creator".
  - Token expirado → auto-refresh (já implementado no transport); se falhar, CTA reconectar preservando a tool selecionada.
  - Erro de execução → toast + card de erro com mensagem, sem perder inputs.

3. **Server functions** em `src/lib/creator-mcp.functions.ts`:
   - `listCreatorTools()` — autenticado, retorna `McpToolDescriptor[]` do Creator (usa `getMcpCredentials("creator")` + `mcpInitializeAndListTools`). Retorna shape `{ ok, data? , error?: { code, message } }` com códigos `MCP_NOT_CONNECTED`, `MCP_UNAVAILABLE`.
   - `runCreatorTool({ name, args })` — autenticado, chama `callMcpTool` do `mcp-client/transport.server.ts` com timeout 60s (sem schema — a UI mostra o raw). Retorna `{ ok, result?, error? }`.
   - Ambas usam `requireSupabaseAuth`; nenhuma toca `supabaseAdmin` no top-level.

4. **Menu lateral** (`src/components/app-shell.tsx`): novo item "Creator MCP" apontando para `/creator-mcp` (ícone Sparkles/Bot — decido no build). Mantenho o item "Creator" existente separado.

5. **Reuso**:
   - Transporte, OAuth, refresh: `src/lib/mcp.server.ts` e `mcp-client/transport.server.ts` (nada novo).
   - Erros tipados: `mcp-client/errors.ts`.
   - UI primitives shadcn já no projeto (Card, Button, Input, Textarea, Select, Switch, Badge, AlertDialog, ScrollArea, Skeleton, Tabs).

## Não faz parte

- Não altera Orquestrador nem Análise de Campanhas.
- Não persiste histórico de execuções em banco (só sessão). Se quiser log persistente depois, adiciono tabela `mcp_tool_runs`.
- Não cria wrapper de "análises consolidadas" para Creator — é execução crua de tools.
- Não mexe em `/creator` existente.

## Arquivos

**Novos:**
- `src/routes/_authenticated/creator-mcp.tsx`
- `src/lib/creator-mcp.functions.ts`
- `src/components/creator-mcp/tool-list.tsx`
- `src/components/creator-mcp/tool-runner.tsx`
- `src/components/creator-mcp/schema-form.tsx` (renderer JSON Schema → campos)
- `src/components/creator-mcp/result-view.tsx`

**Editados:**
- `src/components/app-shell.tsx` (item de menu)
- `src/routeTree.gen.ts` (auto pelo plugin)

## Riscos

- **JSON Schemas complexos/aninhados**: o form auto-gerado cobre casos comuns; para schemas exóticos, o fallback "JSON raw" garante que qualquer tool ainda seja executável.
- **Tools destrutivas**: bloqueadas por confirmação explícita.
- **Timeout**: 60s no server-fn; UI mostra estado "executando…" com cancelamento client-side (aborta o request, mas o server continua — documentado no toast).
