import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import {
  listCopilotRecommendations,
  generateCopilotRecommendations,
  dismissRecommendation,
} from "@/lib/modules.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { MODULES, getModule, type ModuleSlug } from "@/lib/modules";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
  Lightbulb,
  AlertTriangle,
  Info,
  Users,
  Target,
  PenTool,
  Layers,
  BarChart3,
  GraduationCap,
  Activity,
  AlertCircle,
  Wand2,
  MessagesSquare,
  Map,
  Trophy,
  Route as RouteIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Fluxos — Marketing OS" }] }),
  component: Dashboard,
});

// ---------- Flow definitions ----------

type FlowStep = {
  label: string;
  icon: LucideIcon;
  /** Módulo relacionado — usado para cor e link. Se ausente, é neutro. */
  module?: ModuleSlug;
  /** Rota clicável (opcional, senão usa a do módulo). */
  to?: string;
};

type FlowDef = {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  accent: string; // css color
  steps: FlowStep[];
};

const FLOWS: FlowDef[] = [
  {
    id: "planejar-executar",
    number: 1,
    title: "Planejar → Executar → Aprender",
    subtitle: "Do entendimento do cliente ao ciclo de aprendizado.",
    accent: "var(--brand-creator)",
    steps: [
      { label: "Criar Persona", icon: Users, module: "deepersona" },
      { label: "Criar Estratégia", icon: Target, module: "estrategia" },
      { label: "Criar Campanha", icon: PenTool, module: "creator" },
      { label: "Criar Projeto", icon: Layers, module: "soma" },
      { label: "Executar", icon: Activity, module: "soma" },
      { label: "Mensurar", icon: BarChart3, module: "lekpis" },
      { label: "Aprender", icon: GraduationCap, module: "ia" },
    ],
  },
  {
    id: "kpi-recuperacao",
    number: 2,
    title: "Detecção e recuperação de KPI",
    subtitle: "A IA vê a queda, propõe a resposta, os módulos executam.",
    accent: "var(--brand-lekpi)",
    steps: [
      { label: "Detectar queda de KPI", icon: AlertCircle, module: "lekpis" },
      { label: "IA identifica causa", icon: Sparkles, module: "ia" },
      { label: "Sugere campanha", icon: Wand2, module: "ia" },
      { label: "Creator cria", icon: PenTool, module: "creator" },
      { label: "Soma executa", icon: Layers, module: "soma" },
      { label: "LeKPIs acompanha", icon: BarChart3, module: "lekpis" },
    ],
  },
  {
    id: "comunidade",
    number: 3,
    title: "Comunidade e engajamento",
    subtitle: "De nova comunidade a recomendações contínuas.",
    accent: "oklch(0.7 0.18 340)",
    steps: [
      { label: "Nova Comunidade", icon: MessagesSquare, module: "comunidades" },
      { label: "Criar Jornada", icon: Map, module: "comunidades" },
      { label: "Criar Conteúdo", icon: PenTool, module: "creator" },
      { label: "Gamificação", icon: Trophy, module: "comunidades" },
      { label: "Mensurar", icon: BarChart3, module: "lekpis" },
      { label: "Recomendar melhorias", icon: Sparkles, module: "ia" },
    ],
  },
];

// ---------- Page ----------

function Dashboard() {
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const { currentOrgId } = useWorkspace();

  const firstName = (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";
  const orgName = boot.data?.memberships.find((m) => m.organization?.id === currentOrgId)?.organization?.name;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
      <header className="mb-8 flex flex-col gap-1">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Marketing OS · LeFil{orgName ? ` · ${orgName}` : ""}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">
          Olá, {firstName}.
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Sua operação em três fluxos. Escolha por onde começar — cada passo abre o módulo certo.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <section aria-label="Fluxos" className="space-y-5">
          {FLOWS.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </section>

        <aside className="space-y-4">
          <CopilotPanel />
        </aside>
      </div>
    </div>
  );
}

// ---------- Flow card ----------

function FlowCard({ flow }: { flow: FlowDef }) {
  return (
    <article
      className="surface-card overflow-hidden"
      style={{ borderColor: `color-mix(in oklab, ${flow.accent} 18%, var(--border))` }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg text-xs font-semibold text-white"
            style={{ background: flow.accent }}
          >
            {flow.number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <RouteIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Fluxo {flow.number}
              </span>
            </div>
            <h2 className="mt-0.5 font-display text-base font-semibold leading-tight">
              {flow.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{flow.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="px-5 py-5">
        <ol className="flex flex-wrap items-stretch gap-y-3">
          {flow.steps.map((step, i) => (
            <li key={i} className="flex items-stretch">
              <FlowStepChip step={step} accent={flow.accent} />
              {i < flow.steps.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="mx-1.5 h-3.5 w-3.5 self-center shrink-0 text-muted-foreground/70"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function FlowStepChip({ step, accent }: { step: FlowStep; accent: string }) {
  const mod = step.module ? getModule(step.module) : undefined;
  const to = step.to ?? mod?.route;
  const color = mod?.color ?? accent;
  const Icon = step.icon;

  const inner = (
    <div
      className="group flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5"
      style={{
        borderColor: `color-mix(in oklab, ${color} 30%, var(--border))`,
        background: `color-mix(in oklab, ${color} 6%, var(--surface))`,
      }}
    >
      <span
        className="grid h-5 w-5 place-items-center rounded-full"
        style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="text-foreground">{step.label}</span>
      {mod && (
        <span
          className="ml-0.5 text-[9px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground"
        >
          {mod.name}
        </span>
      )}
    </div>
  );

  if (!to) return inner;
  return (
    <Link to={to} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
      {inner}
    </Link>
  );
}

// ---------- Copilot ----------

function CopilotPanel() {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [generating, setGenerating] = useState(false);

  const list = useQuery({
    queryKey: ["copilot", currentOrgId],
    queryFn: () => listCopilotRecommendations({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const generate = useMutation({
    mutationFn: () => generateCopilotRecommendations({ data: { organizationId: currentOrgId! } }),
    onMutate: () => setGenerating(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["copilot", currentOrgId] });
      toast.success("Recomendações atualizadas pela IA.");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao consultar a IA."),
    onSettled: () => setGenerating(false),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => dismissRecommendation({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["copilot", currentOrgId] }),
  });

  const items = list.data?.items ?? [];

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-hero text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-medium leading-none">Copiloto IA</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Recomendações contextuais</div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => generate.mutate()}
          disabled={generating || !currentOrgId}
          className="h-7 px-2 gap-1 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
          {items.length === 0 ? "Gerar" : "Atualizar"}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          Nenhuma recomendação ainda. Clique em <span className="font-medium">Gerar</span> para consultar a IA.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((rec) => {
            const mod = MODULES.find((m) => m.slug === rec.module);
            const SevIcon = rec.severity === "warning" ? AlertTriangle : rec.severity === "opportunity" ? Lightbulb : Info;
            return (
              <li key={rec.id} className="group relative rounded-lg border bg-surface/60 p-3 hover:border-primary/40 transition-colors">
                <button
                  onClick={() => dismiss.mutate(rec.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  aria-label="Dispensar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-start gap-2">
                  <SevIcon className="h-3.5 w-3.5 mt-0.5 shrink-0"
                           style={{ color: mod?.color ?? "var(--muted-foreground)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium leading-snug">{rec.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{rec.body}</p>
                    {mod && (
                      <button
                        type="button"
                        onClick={() => nav({ to: mod.route })}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium hover:underline"
                        style={{ color: mod.color }}
                      >
                        {rec.action_hint || `Ir para ${mod.name}`}
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 uppercase tracking-wider">
                    {mod?.name ?? rec.module}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
