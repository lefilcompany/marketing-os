## Objetivo

Remover completamente a integração MCP do LeKPIs (código, rota, provider, conexão salva). Manter intacto o módulo de negócio "LeKPIs" mais amplo (search, flows, KPIs, seed templates, estilos, command palette, `modules.ts` etc.) — esse não é MCP.

## Escopo — apagar

Arquivos deletados:
- `src/lib/mcp-client/providers/lekpis.server.ts`
- `src/lib/campaign-analysis.functions.ts`
- `src/lib/campaign-analysis.schemas.ts`
- `src/routes/_authenticated/analise-campanhas.tsx`

Edições:
- `src/lib/mcp.server.ts` — remover a entrada `lekpis: { ... }` de `MCP_PROVIDERS`.
- `src/lib/aeiou-modules.ts` — no bloco do LeKPIs (linha 148–157), remover `mcpProvider: "lekpis"` e trocar `status: "ready"` por `status: "coming_soon"` (ou manter `ready` sem MCP, à sua escolha — proponho `coming_soon` já que a nova abordagem virá).
- `src/components/app-shell.tsx` — remover o item de nav `{ to: "/analise-campanhas", label: "Análise de Campanhas", icon: BarChart3 }`.

Banco:
- `DELETE FROM mcp_connections WHERE provider = 'lekpis'` — remove a única conexão salva (usuário `658622e5-…`).

## Fora de escopo (mantido)

- `src/routes/_authenticated/lekpis.tsx` (placeholder "em reformulação") — mantém.
- `src/lib/modules.ts`, `flows.ts`, `search.functions.ts`, `modules.functions.ts`, `command-palette.tsx`, `module-shell.tsx`, `edit-kpi-dialog.tsx`, `seed-template-button.tsx`, tokens `.lekpis-*` em `styles.css`, asset `lekpis-logo.png` — são do módulo de negócio LeKPIs, não da integração MCP.
- Secret `LEKPIS_SUPABASE_ANON_KEY` — deixo para você decidir; se quiser eu removo em seguida.

## Verificação

1. Build passa (typecheck).
2. `/analise-campanhas` retorna 404 (rota removida).
3. `mcp_connections` sem linhas com `provider='lekpis'`.
4. Página `/configuracoes` (MCP) não lista mais LeKPIs.