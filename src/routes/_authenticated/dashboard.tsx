import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import {
  listCopilotRecommendations,
  generateCopilotRecommendations,
  dismissRecommendation,
} from "@/lib/modules.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { MODULES, getModule } from "@/lib/modules";
import { FLOWS, type FlowDef, type FlowStepDef } from "@/lib/flows";
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
  Bot,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Marketing OS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });

  const firstName = (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";
  const orgName = boot.data?.memberships.find((m) => m.organization?.id === currentOrgId)?.organization?.name;

  const [flow1, flow2, flow3] = FLOWS;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F6F9FC]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-12">
        {/* Hero — saudação + estado */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
              Marketing OS · LeFil{orgName ? ` · ${orgName}` : ""}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground">
              Olá, {firstName}.
            </h1>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Seu workspace está pronto — escolha um fluxo para começar.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-2 pl-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">Copiloto IA ativo</div>
            <button
              onClick={() => document.getElementById("copilot-panel")?.scrollIntoView({ behavior: "smooth" })}
              className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
              aria-label="Abrir copiloto"
            >
              <Bot className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Fluxo 1 — hero grande */}
        <FlowHeroCard flow={flow1} />

        {/* Fluxos 2 e 3 — compactos lado a lado */}
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <FlowCompactCard flow={flow2} />
          <FlowCompactCard flow={flow3} />
        </div>

        {/* Copiloto */}
        <div id="copilot-panel" className="mt-10">
          <CopilotPanel />
        </div>
      </div>
    </div>
  );
}

// ---------- Fluxo — hero (Fluxo 1) ----------

function FlowHeroCard({ flow }: { flow: FlowDef }) {
  const nav = useNavigate();

  const start = () => {
    const first = flow.steps[0];
    const mod = getModule(first.module);
    const to = first.to ?? mod?.route ?? "/dashboard";
    nav({ to, search: { flow: flow.id, step: 0 } as never });
  };

  return (
    <section className="group relative bg-white border border-border rounded-[32px] p-8 lg:p-10 transition-all duration-500 hover:shadow-[0_24px_60px_-20px_color-mix(in_oklab,var(--primary)_25%,transparent)] hover:-translate-y-0.5 overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 40%, transparent), transparent 60%)" }}
      />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-2">
            Fluxo {flow.number} · {flow.eyebrow}
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-semibold text-foreground">{flow.title}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{flow.subtitle}</p>
        </div>
        <Button
          onClick={start}
          size="lg"
          className="rounded-2xl gap-2 font-semibold shadow-lg shadow-primary/20"
        >
          Iniciar Fluxo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Trilho de etapas */}
      <div className="relative">
        {/* Linha do trilho */}
        <div
          aria-hidden
          className="absolute top-5 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
        <ol className="relative flex items-start justify-between gap-2">
          {flow.steps.map((step, i) => (
            <TrackNode key={step.key} step={step} index={i} flow={flow} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function TrackNode({ step, index, flow }: { step: FlowStepDef; index: number; flow: FlowDef }) {
  const nav = useNavigate();
  const mod = getModule(step.module);
  const color = mod?.color ?? "var(--primary)";

  const go = () => {
    const to = step.to ?? mod?.route ?? "/dashboard";
    nav({ to, search: { flow: flow.id, step: index } as never });
  };

  return (
    <li className="z-10 flex flex-col items-center gap-2 flex-1 min-w-0">
      <button
        onClick={go}
        className="grid h-10 w-10 place-items-center rounded-xl border text-[11px] font-bold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          background: `color-mix(in oklab, ${color} 10%, white)`,
          borderColor: `color-mix(in oklab, ${color} 25%, var(--border))`,
          color,
        }}
        title={step.label}
      >
        {step.short}
      </button>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center leading-tight">
        {step.label}
      </span>
    </li>
  );
}

// ---------- Fluxo — compacto (Fluxos 2 e 3) ----------

function FlowCompactCard({ flow }: { flow: FlowDef }) {
  const nav = useNavigate();

  const start = () => {
    const first = flow.steps[0];
    const mod = getModule(first.module);
    const to = first.to ?? mod?.route ?? "/dashboard";
    nav({ to, search: { flow: flow.id, step: 0 } as never });
  };

  return (
    <section className="group bg-white border border-border rounded-[28px] p-7 transition-all hover:shadow-xl hover:-translate-y-0.5">
      <header className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-2">
          Fluxo {flow.number} · {flow.eyebrow}
        </div>
        <h3 className="font-display text-xl font-semibold text-foreground">{flow.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{flow.subtitle}</p>
      </header>

      <div className="flex flex-wrap gap-2 mb-8">
        {flow.steps.map((step) => {
          const mod = getModule(step.module);
          const color = mod?.color ?? "var(--primary)";
          return (
            <span
              key={step.key}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
              style={{
                background: `color-mix(in oklab, ${color} 8%, white)`,
                borderColor: `color-mix(in oklab, ${color} 22%, var(--border))`,
                color,
              }}
            >
              {step.label}
            </span>
          );
        })}
      </div>

      <button
        onClick={start}
        className="w-full py-3 rounded-xl border border-border text-foreground font-semibold text-sm transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary flex items-center justify-center gap-2"
      >
        Entrar no Fluxo
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

// ---------- Copiloto ----------

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
    <div className="bg-white border border-border rounded-[28px] p-7">
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero text-white shadow-lg shadow-primary/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">Copiloto IA</div>
            <div className="text-sm font-semibold leading-none mt-1">Recomendações contextuais</div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => generate.mutate()}
          disabled={generating || !currentOrgId}
          className="h-8 gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
          {items.length === 0 ? "Gerar" : "Atualizar"}
        </Button>
      </div>

      {list.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma recomendação ainda. Clique em <span className="font-medium">Gerar</span> para consultar a IA.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((rec) => {
            const mod = MODULES.find((m) => m.slug === rec.module);
            const SevIcon = rec.severity === "warning" ? AlertTriangle : rec.severity === "opportunity" ? Lightbulb : Info;
            return (
              <li key={rec.id} className="group relative rounded-xl border bg-white p-4 hover:border-primary/40 transition-colors">
                <button
                  onClick={() => dismiss.mutate(rec.id)}
                  className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  aria-label="Dispensar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="flex items-start gap-2">
                  <SevIcon className="h-4 w-4 mt-0.5 shrink-0"
                           style={{ color: mod?.color ?? "var(--muted-foreground)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-snug">{rec.title}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">{rec.body}</p>
                    {mod && (
                      <button
                        type="button"
                        onClick={() => nav({ to: mod.route })}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
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
