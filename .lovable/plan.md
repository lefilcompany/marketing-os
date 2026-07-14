## Objetivo

Apagar toda a implementação atual do LeKPIs (rotas, componentes, hooks, client, contexto e referências) para recomeçarmos limpos.

## O que será deletado

**Rotas** (`src/routes/_authenticated/`)
- `lekpis.tsx`
- `lekpis.index.tsx`
- `lekpis.integracoes.tsx`
- `lekpis.perfil.tsx`
- `lekpis.canal.$slug.tsx`

**Componentes** (`src/components/lekpis/`)
- `canal-card.tsx`, `cliente-selector.tsx`, `integracao-card.tsx`, `top-bar.tsx`
- Diretório `src/components/lekpis/` removido

**Hooks / lib / contexto**
- `src/hooks/use-lekpis-queries.ts`
- `src/hooks/use-lekpis-connect.ts`
- `src/lib/lekpis-client.ts`
- `src/contexts/cliente-ativo-context.tsx`

**Assets**
- `src/assets/lekpis-logo.png.asset.json` (e o png associado, se houver)

**Plano interno**
- `.lovable/plan.md` (notas de diagnóstico do LeKPIs)

## Referências a limpar (sem quebrar o resto do app)

Remover imports/entradas relacionadas ao LeKPIs em:
- `src/lib/modules.ts` e `src/lib/modules.functions.ts` — tirar o módulo LeKPIs do catálogo
- `src/lib/flows.ts` — remover flows do LeKPIs
- `src/lib/search.functions.ts` — remover entradas de busca do LeKPIs
- `src/components/command-palette.tsx` — remover comandos do LeKPIs
- `src/components/app-shell.tsx` — remover item de navegação do LeKPIs
- `src/components/module-shell.tsx` — remover branch específico do LeKPIs, se houver
- `src/components/edit-kpi-dialog.tsx` e `src/components/seed-template-button.tsx` — se forem exclusivos do LeKPIs, deletar; caso contrário, remover apenas o acoplamento
- `src/routes/_authenticated/dashboards.tsx` — remover trechos referentes ao LeKPIs
- `src/lib/mcp.server.ts` — remover provider `lekpis` (mantendo a infra MCP genérica)
- `src/styles.css` — remover classes `.lekpis-*`
- `src/routeTree.gen.ts` — regenerado automaticamente pelo plugin

## O que NÃO será tocado

- Infra MCP genérica (`src/lib/mcp.functions.ts`, `src/routes/api/mcp/callback.ts`) — continua útil para outras integrações.
- Auth, Supabase, roteador raiz, layout, outras apps (DeePersona, Creator, Soma, etc.).
- Conexões/segredos já cadastrados no backend (posso limpar depois, se quiser).

## Depois disso

Fica um estado limpo, sem rota `/lekpis` e sem menções ao módulo. A partir daí, recomeçamos do zero conforme você definir escopo, telas e integrações.

Confirma que posso apagar tudo listado acima?
