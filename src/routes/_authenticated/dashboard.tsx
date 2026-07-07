import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessionBootstrap, getWorkspaceApps } from "@/lib/workspace.functions";
import { resolveAppRedirect } from "@/lib/applications.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight, Sparkles, Layers, BarChart3, Users, Brain, PenTool, Rocket, Activity, Circle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Marketing OS — LeFil" }] }),
  component: Dashboard,
});

const ICONS: Record<string, any> = {
  Sparkles, Layers, BarChart3, Users, Brain, PenTool, Rocket, Activity, Kanban: Layers,
};

function Dashboard() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const apps = useQuery({
    queryKey: ["ws-apps", currentOrgId],
    queryFn: () => getWorkspaceApps({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const firstName = (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";
  const list = (apps.data?.apps ?? []).slice(0, 4);

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
             style={{ background: "radial-gradient(circle, var(--brand-creator), transparent 60%)" }} />
        <div className="absolute top-20 -right-32 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
             style={{ background: "radial-gradient(circle, var(--brand-deepersona), transparent 60%)" }} />
        <div className="absolute -bottom-32 left-1/3 h-[420px] w-[420px] rounded-full blur-3xl opacity-40"
             style={{ background: "radial-gradient(circle, var(--brand-lekpi), transparent 60%)" }} />
      </div>

      <div className="mx-auto h-full max-w-6xl px-6">
        <div className="flex h-full flex-col items-center justify-center gap-10 lg:flex-row lg:justify-between">
          <header className="space-y-2 text-left lg:max-w-xs">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Marketing OS · LeFil</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">
              Olá, {firstName}.
            </h1>
            <p className="text-sm text-muted-foreground">
              Sua central de plataformas de marketing. Escolha uma para começar.
            </p>
          </header>

          <section className="grid grid-cols-2 gap-5">
            {apps.isLoading && [0,1,2,3].map(i => <Skeleton key={i} className="h-52 w-52 rounded-2xl" />)}
            {!apps.isLoading && list.length === 0 && (
              <div className="col-span-2 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nenhuma aplicação liberada para este workspace ainda.
              </div>
            )}
            {list.map((app: any) => (
              <PlatformTile key={app.id} app={app} orgId={currentOrgId!} />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function PlatformTile({ app, orgId }: { app: any; orgId: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const Icon = ICONS[app.icon] ?? Sparkles;
  const color = app.accent_color ?? "var(--primary)";

  const open = useMutation({
    mutationFn: () => resolveAppRedirect({ data: { organizationId: orgId, applicationId: app.id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["recent", orgId] });
      if (r.openMode === "same_tab") window.location.href = r.url;
      else window.open(r.url, "_blank", "noopener,noreferrer");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disabled = !app.canAccess || open.isPending;

  return (
    <button
      type="button"
      onClick={() => (disabled ? nav({ to: "/aplicacoes/$slug", params: { slug: app.slug } }) : open.mutate())}
      className="group relative h-52 w-52 overflow-hidden rounded-2xl text-left transition-all duration-500 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 22%, transparent), color-mix(in oklab, ${color} 4%, transparent))`,
        boxShadow: `0 16px 48px -16px color-mix(in oklab, ${color} 45%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.15)`,
      }}
    >
      {/* Glass layer */}
      <div className="absolute inset-0 backdrop-blur-2xl" style={{ background: "rgba(255,255,255,0.04)" }} />
      {/* Border */}
      <div className="absolute inset-0 rounded-2xl border border-white/15" />

      {/* Top highlight reflection */}
      <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-2xl opacity-70"
           style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.18), transparent)" }} />

      {/* Color glow */}
      <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
           style={{ background: color }} />

      {/* Sheen sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 ease-out group-hover:translate-x-full"
           style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <div
            className="grid h-12 w-12 place-items-center rounded-xl border border-white/20 backdrop-blur-xl"
            style={{ background: `color-mix(in oklab, ${color} 35%, rgba(255,255,255,0.08))` }}
          >
            <Icon className="h-5 w-5 text-white drop-shadow" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2 py-1 backdrop-blur-md">
            <Circle className="h-1 w-1 fill-current" style={{ color: statusColor(app.status) }} />
            <span className="text-[10px] uppercase tracking-wider text-white/80">{statusLabel(app.status)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-xl font-semibold text-white">{app.name}</h3>
          <p className="text-sm text-white/70 line-clamp-2">{app.short_description}</p>
          <div className="pt-1 flex items-center gap-1.5 text-sm font-medium text-white">
            <span>{app.canAccess ? "Abrir" : "Detalhes"}</span>
            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>

      {/* Bottom mirror reflection */}
      <div className="pointer-events-none absolute inset-x-4 -bottom-2 h-6 rounded-full blur-2xl opacity-50"
           style={{ background: color }} />
    </button>
  );
}

function statusLabel(s: string) {
  return { available: "Ativo", unstable: "Instável", maintenance: "Manutenção", unavailable: "Offline", coming_soon: "Em breve" }[s] ?? s;
}
function statusColor(s: string) {
  return { available: "hsl(142 70% 55%)", unstable: "hsl(38 92% 60%)", maintenance: "hsl(38 92% 60%)", unavailable: "hsl(0 72% 60%)", coming_soon: "hsl(220 10% 60%)" }[s] ?? "hsl(220 10% 60%)";
}

export function AppIcon({ app, size = "md" }: { app: any; size?: "sm" | "md" }) {
  const Icon = ICONS[app.icon] ?? Sparkles;
  const s = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${s} rounded-lg grid place-items-center shrink-0`}
         style={{ background: `${app.accent_color ?? "var(--primary)"}18`, color: app.accent_color ?? "var(--primary)" }}>
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  );
}

export function categoryLabel(c: string) {
  return {
    strategy: "Estratégia", content: "Conteúdo", operations: "Operação",
    data_performance: "Dados & Performance", artificial_intelligence: "IA",
    research_audience: "Pesquisa & Audiência",
  }[c] ?? c;
}
