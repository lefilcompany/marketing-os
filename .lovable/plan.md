## Objetivo

Na rota `/dashboards`, (1) trocar o visual atual dos cards (gradiente translúcido + texto branco, ilegível) por um estilo claro/legível alinhado à home dos módulos AEIOU, e (2) mostrar um resumo real de dados para cada **plataforma integrada** do Marketing OS.

## Escopo

Somente `/dashboards`. A home dos módulos AEIOU, `/modulo/$letra` e o `ToolCard` ficam intactos.

## Plataformas integradas consideradas

Fonte de verdade: `src/lib/aeiou-modules.ts` — plataformas com `status: "ready"`:

- **DeePersona** (A)
- **Creator** (I)
- **Soma** (O)
- **LeKPIs** (O)

As demais (MonitorNews, Strateegia, Discourse, RD Marketing, AgentU) aparecem no mesmo grid como cards "Aguardando integração", sem métricas — apenas nome, descrição e badge cinza. Assim o dashboard reflete o mesmo catálogo AEIOU, sem sumir com plataformas ainda não conectadas.

## Resumo de dados por plataforma

Nova server function `getPlatformSummaries` em `src/lib/modules.functions.ts` (protegida por `requireSupabaseAuth`, filtrada por `organization_id`), retornando 3 métricas curtas por plataforma integrada:

- **DeePersona** — personas totais · priorizadas (importance/urgency preenchidos) · atualizadas nos últimos 30 dias
- **Creator** — campanhas totais · ativas (`status = 'active'`) · próximas (`starts_at >= hoje`)
- **Soma** — projetos ativos (`status != 'done'`) · tarefas em aberto (`status in ('todo','doing')`) · tarefas concluídas
- **LeKPIs** — indicadores monitorados · % atingindo meta (`value >= target`) · última atualização

Retorno tipado:

```ts
type PlatformStat = { label: string; value: string; hint?: string };
type PlatformSummary = {
  toolId: "deepersona" | "creator" | "soma" | "lekpis";
  stats: PlatformStat[];
  updatedAt: string | null;
};
```

Todas as leituras usam `head: true` + `count: "exact"` (não retornam linhas) e uma única query com `select("updated_at")` ordenada desc `limit(1)` para o "atualizado em". Sem I/O extra pesado.

## Visual do card (novo)

Baseado no `ModuleCard` da home (fundo branco, borda suave, faixa colorida no topo), aplicado a cada plataforma:

```text
┌────────────────────────────────────┐
│ ▔▔▔▔▔ faixa cor da plataforma ▔▔▔▔ │
│ [logo/ícone]     Módulo A · Ambien.│
│ DeePersona                      ↗  │
│ Segmente e priorize personas.      │
│                                    │
│  12         4          3           │
│  Personas   Priorizad. Atualiz.30d │
└────────────────────────────────────┘
```

Detalhes:
- `bg-white`, `border border-border/70`, `shadow-sm`, hover `-translate-y-0.5 hover:shadow-lg`
- Faixa `h-1.5` no topo com a cor do módulo AEIOU pai (A/E/I/O/U — mesma paleta pastel já ajustada)
- Cabeçalho: ícone da ferramenta em quadrado colorido suave (`color-mix 12%`), nome em `text-foreground`, tagline em `text-muted-foreground`, chip pequeno "Módulo X — Nome"
- 3 métricas em grade `grid-cols-3`, cada uma: valor grande (`text-2xl font-display font-semibold text-foreground`) + label pequena (`text-[10px] uppercase tracking-wider text-muted-foreground`)
- Skeleton do `shadcn/ui` enquanto `overview.isLoading`
- Rodapé opcional: "Atualizado há 2 dias" quando existir `updatedAt`
- Card inteiro é `Link` para `/modulo/{letra}` da ferramenta pai (mesma rota já existente)

Cards de plataformas "coming_soon":
- Mesmo shell, sem métricas
- Badge cinza `Aguardando integração` no lugar da linha de stats
- `opacity-80`, sem hover elevation

## Alterações de arquivo

- `src/lib/modules.functions.ts` — adicionar `getPlatformSummaries` (não altera as fns existentes)
- `src/routes/_authenticated/dashboards.tsx` — reescrever cabeçalho + grid + `ModuleTile` (renomeado para `PlatformCard`), consumindo o novo endpoint via `useQuery`; remover os blobs radiais de fundo e o gradiente escuro
- Sem migrations. Sem alterações em `aeiou-modules.ts`, no menu lateral, ou na home.

## Fora de escopo

- Não mexer no `ToolCard` de `/modulo/$letra`.
- Não adicionar gráficos/sparklines nesta iteração — só números + label.
- Não tocar em contadores usados por outras telas (`getModulesOverview` permanece).
