# LeKPIs Simplificado

## Ajustes ao briefing (o repo não usa React Router)

Este projeto é **TanStack Router file-based** com gate `_authenticated`. As telas vão viver como rotas filhas de `/lekpis`, não em `src/pages/`. Semanticamente equivale ao pedido — só muda a árvore de arquivos.

Mapeamento:

| Briefing | Rota real | Arquivo |
|---|---|---|
| `/` (Home) | `/lekpis` | `src/routes/_authenticated/lekpis.index.tsx` |
| `/canal/:slug` | `/lekpis/canal/$slug` | `src/routes/_authenticated/lekpis.canal.$slug.tsx` |
| `/integracoes` | `/lekpis/integracoes` | `src/routes/_authenticated/lekpis.integracoes.tsx` |
| `/perfil` | `/lekpis/perfil` | `src/routes/_authenticated/lekpis.perfil.tsx` |

`/lekpis` layout (`lekpis.tsx`) vira wrapper com TopBar (saudação + `ClienteSelector`) + `<Outlet/>`. A tela atual (templates KPIs + painéis MCP) será apagada — foi pedido no turno anterior.

## Backend / `callLekpis`

O helper `callLekpis` que o briefing menciona **não existe no repo com esse nome**. O que existe é `callMcpTool({ provider, name, arguments })` em `src/lib/mcp.functions.ts`, sobre a tabela `mcp_connections` (não `lekpis_connections`) e sem edge function `mcp-proxy` — o fluxo é server function TanStack. Funcionalmente é equivalente e já está conectado ao LeKPIs neste ambiente, então vou **wrappar** em vez de reimplementar:

```ts
// src/lib/lekpis-client.ts
import { callMcpTool } from "./mcp.functions";
export async function callLekpis<T = any>(name: string, args: Record<string, any> = {}) {
  const { result } = await callMcpTool({ data: { provider: "lekpis", name, arguments: args } });
  return result as T;
}
```

Erros 401/`não conectado` do server fn → capturados no `QueryCache` global e redirecionam para `/lekpis/integracoes` com toast "Reconecte o LeKPIs".

## Cliente ativo

`ClienteAtivoContext` isolado em `localStorage` sob a chave `lekpis:cliente-id` (não escopado por org — se depois virar necessário, adicionamos sufixo `orgId`). No mount do layout `/lekpis`:

1. lê localStorage;
2. se vazio → `callLekpis("cliente.ensure_default")` e salva o `id` retornado;
3. expõe `{ clienteId, setClienteId, cliente }` (o `cliente` vem de um `useQuery(["cliente.get", clienteId])`).

Todas as tools recebem `{ cliente_id: clienteId, ...args }` via um helper `useLekpisQuery(name, args)`.

## Telas

**Layout `/lekpis`** — TopBar com nome+avatar (`profile.get`), `ClienteSelector` (dropdown de `cliente.list`), tabs Home / Integrações / Perfil.

**Home** — saudação, seletor de período (7d/30d/mes_atual, só rótulo), grid 2×2:
- IG card: `instagram.get_kpis` + `instagram.get_kpis_previous` → seguidores + Δ%
- FB card: `facebook.get_kpis` → fãs
- Meta Ads card: `meta_ads.list_campaigns` → investimento agregado
- Google Ads: card desabilitado "Em breve"

Card não conectado ⇒ estado "Conectar" que dispara `useLekpisConnect`. Rodapé com resumo `integracao.list` + CTA "Gerenciar".

**Canal (`/lekpis/canal/$slug`)** — slugs `instagram`, `facebook`, `meta-ads`. Header, `Table` de KPIs (uma linha por período), `LineChart` (recharts, já instalado) sobre a série; empty state com CTA "Conectar via LeKPIs" quando `items` vazio.

**Integrações** — 3 cards (IG/FB/Meta Ads). Lê `integracao.list`, mostra "Conectado — <conta>" ou "Conectar". Conectar via `useLekpisConnect` (`window.open` + `postMessage` de `https://pla.lekpis.lefil.com.br` → invalida `["integracao.list"]`). Desconectar via `integracao.disconnect({ id, confirm: true })` com `AlertDialog`.

**Perfil** — formulário com campos do `profile.get` (nome/telefone/estado/cidade/tipo_empresa/volume_clientes) salvando com `profile.update`. Abaixo, lista `cliente.list` com botão "Definir como ativo" e um botão discreto "Novo cliente" que abre `Dialog` com `cliente.create`.

## Design

Direção definida (sem prototypes — foi pulado):
- Paleta clara, off-white `oklch(0.98 0.01 90)` + ink `oklch(0.18 0.02 260)` + acento único âmbar `oklch(0.75 0.14 65)`; superfícies em `oklch(0.96 0.005 80)` com borda hairline. Suporte a dark auto do app.
- Tipografia: **Fraunces** (display, com opsz variável) + **JetBrains Mono** (numérico dos KPIs) — carregadas por `<link>` no `__root.tsx`. Body herda a stack existente do projeto (não Inter/Poppins).
- Cards flat, sombra leve, radius 12px. Sem glass/blur azul.
- Números grandes com `font-variant-numeric: tabular-nums`, Δ% em pill âmbar/verde/vermelho.

Tokens novos vão para `src/styles.css` (`--lekpis-*`) e um `@layer components` `.lekpis-card` para reuso — não sobrescrevem os tokens globais do MOS.

## Entregáveis

Arquivos novos:
- `src/lib/lekpis-client.ts` — wrapper `callLekpis`
- `src/contexts/cliente-ativo-context.tsx`
- `src/hooks/use-lekpis-connect.ts`
- `src/hooks/use-lekpis-queries.ts` — factory de `queryOptions` por tool (`profileGet`, `clienteList`, `clienteGet`, `integracaoList`, `instagramKpis`, `instagramKpisPrev`, `facebookKpis`, `metaAdsCampaigns`)
- `src/components/lekpis/canal-card.tsx`
- `src/components/lekpis/integracao-card.tsx`
- `src/components/lekpis/cliente-selector.tsx`
- `src/components/lekpis/top-bar.tsx`
- `src/routes/_authenticated/lekpis.tsx` (layout — substitui o atual)
- `src/routes/_authenticated/lekpis.index.tsx` (Home)
- `src/routes/_authenticated/lekpis.canal.$slug.tsx`
- `src/routes/_authenticated/lekpis.integracoes.tsx`
- `src/routes/_authenticated/lekpis.perfil.tsx`

Removidos:
- Bloco de MCP + templates dentro da `/lekpis` atual (o componente atual `lekpis.tsx` é reescrito). `mcp-oauth-panel`, `mcp-status-card`, `mcp-resource-explorer`, `dashboard-templates`, `seed-template-button`, `edit-kpi-dialog`, `lekpis.templates.tsx`, `kpis.functions.ts` **não** são apagados nesta iteração (podem estar sendo referenciados por outros módulos ex.: /lekpis/templates) — se quiser removê-los também, me diga que faço no mesmo passo.

## Fora de escopo

Planos, times, community, decision panel, funil, dashboards compartilhados, onboarding wizard, IA. Google Ads = card desabilitado.

## Suposições (avise se alguma estiver errada)

1. `provider: "lekpis"` já está registrado em `mcp.server.ts` e o usuário logado tem `mcp_connections` row para ele.
2. A rota `/api/mcp/callback` existente é quem faz o `postMessage({type:'lekpis:connected'})` no `window.opener` — se não, a UI só invalida no foco/manual refetch (não bloqueante).
3. Posso manter a rota `/lekpis/templates` e artefatos correlatos existindo em paralelo (não removo nesta iteração salvo pedido explícito).
