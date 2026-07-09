import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import {
  getModulesOverview,
  listCopilotRecommendations,
  generateCopilotRecommendations,
  dismissRecommendation,
} from "@/lib/modules.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { MODULES, type ModuleDef } from "@/lib/modules";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Sparkles, RefreshCw, X, Lightbulb, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Marketing OS — LeFil" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const overview = useQuery({
    queryKey: ["modules-overview", currentOrgId],
    queryFn: () => getModulesOverview({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const firstName = (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";
  const orgName = boot.data?.memberships.find((m) => m.organization?.id === currentOrgId)?.organization?.name;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40"
             style={{ background: "radial-gradient(circle, var(--brand-creator), transparent 60%)" }} />
        <div className="absolute top-20 -right-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-40"
             style={{ background: "radial-gradient(circle, var(--brand-deepersona), transparent 60%)" }} />
        <div className="absolute -bottom-40 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-40"
             style={{ background: "radial-gradient(circle, var(--brand-lekpi), transparent 60%)" }} />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:py-10">
        <header className="mb-8 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Marketing OS · LeFil{orgName ? ` · ${orgName}` : ""}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">
            Olá, {firstName}.
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Seu sistema operacional de marketing. Escolha um módulo para começar.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
          <section aria-label="Módulos" className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {MODULES.map((mod) => (
              <ModuleTile
                key={mod.slug}
                module={mod}
                count={overview.data?.counts[mod.slug] ?? 0}
                loading={overview.isLoading}
              />
            ))}
          </section>

          <aside className="space-y-4">
            <CopilotPanel />
          </aside>
        </div>
      </div>
    </div>
  );
}

function ModuleTile({ module: mod, count, loading }: { module: ModuleDef; count: number; loading: boolean }) {
  const Icon = mod.icon;
  const color = mod.color;

  const countLabel = (() => {
    switch (mod.slug) {
      case "deepersona": return "personas";
      case "estrategia": return "estratégias";
      case "creator": return "campanhas";
      case "soma": return "projetos & tarefas";
      case "comunidades": return "comunidades";
      case "lekpis": return "indicadores";
      case "biblioteca": return "itens";
      case "ia": return "copiloto";
    }
  })();

  return (
    <Link
      to={mod.route}
      className="group relative block h-56 overflow-hidden rounded-2xl text-left transition-all duration-500 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 24%, transparent), color-mix(in oklab, ${color} 4%, transparent))`,
        boxShadow: `0 20px 60px -20px color-mix(in oklab, ${color} 45%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.15)`,
      }}
    >
      <div className="absolute inset-0 backdrop-blur-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="absolute inset-0 rounded-2xl border border-white/15" />
      <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl opacity-70"
           style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18), transparent)" }} />
      <div className="absolute -top-24 -right-24 h-52 w-52 rounded-full blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
           style={{ background: color }} />
      <div className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 ease-out group-hover:translate-x-full"
           style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)" }} />

      <div className="relative z-10 flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/25 backdrop-blur-xl"
            style={{ background: `color-mix(in oklab, ${color} 35%, rgba(255,255,255,0.08))` }}
          >
            <Icon className="h-5 w-5 text-white drop-shadow" />
          </div>
          <ArrowUpRight className="h-4 w-4 text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-white leading-tight">{mod.name}</h3>
          <p className="text-xs text-white/70 line-clamp-2">{mod.tagline}</p>
          <div className="pt-2 flex items-baseline gap-1.5 text-white/90">
            {loading ? (
              <Skeleton className="h-5 w-10 bg-white/10" />
            ) : (
              <span className="font-display text-lg font-semibold">{count}</span>
            )}
            <span className="text-[11px] text-white/60">{countLabel}</span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-4 -bottom-2 h-8 rounded-full blur-2xl opacity-50"
           style={{ background: color }} />
    </Link>
  );
}

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
