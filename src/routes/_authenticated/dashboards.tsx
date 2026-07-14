import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import { getModulesOverview } from "@/lib/modules.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { MODULES, type ModuleDef } from "@/lib/modules";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboards")({
  head: () => ({ meta: [{ title: "Dashboards — Marketing OS" }] }),
  component: Dashboards,
});

function Dashboards() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const overview = useQuery({
    queryKey: ["modules-overview", currentOrgId],
    queryFn: () => getModulesOverview({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

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
            Dashboards
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Panorama de todos os módulos e seus indicadores.
          </p>
        </header>

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
