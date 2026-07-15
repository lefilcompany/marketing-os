import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { AEIOU_MODULES, type AeiouModule } from "@/lib/aeiou-modules";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Marketing OS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({
    queryKey: ["session-bootstrap"],
    queryFn: () => getSessionBootstrap(),
  });

  const firstName =
    (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";
  const orgName = boot.data?.memberships.find(
    (m) => m.organization?.id === currentOrgId,
  )?.organization?.name;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F6F9FC]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-12">
        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Marketing OS · LeFil{orgName ? ` · ${orgName}` : ""}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground">
            Olá, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Seus módulos <span className="font-semibold">A · E · I · O · U</span> —
            escolha um módulo para ver e configurar as ferramentas.
          </p>
        </header>

        <section
          aria-label="Módulos"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {AEIOU_MODULES.map((mod) => (
            <ModuleCard key={mod.letter} module={mod} />
          ))}
        </section>
      </div>
    </div>
  );
}

function ModuleCard({ module: mod }: { module: AeiouModule }) {
  return (
    <Link
      to="/modulo/$letra"
      params={{ letra: mod.letter }}
      className="group relative block h-56 overflow-hidden rounded-2xl text-left transition-all duration-500 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 26%, transparent), color-mix(in oklab, ${mod.color} 6%, transparent))`,
        boxShadow: `0 20px 60px -20px color-mix(in oklab, ${mod.color} 45%, transparent), inset 0 1px 0 0 rgba(255,255,255,0.15)`,
      }}
    >
      <div
        className="absolute inset-0 backdrop-blur-2xl"
        style={{ background: "rgba(255,255,255,0.04)" }}
      />
      <div className="absolute inset-0 rounded-2xl border border-white/15" />
      <div
        className="absolute -top-24 -right-24 h-52 w-52 rounded-full blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: mod.color }}
      />
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 ease-out group-hover:translate-x-full"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/25 backdrop-blur-xl font-display text-2xl font-semibold text-white drop-shadow"
            style={{
              background: `color-mix(in oklab, ${mod.color} 45%, rgba(255,255,255,0.08))`,
            }}
          >
            {mod.letter}
          </div>
          <ArrowUpRight className="h-4 w-4 text-white/70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-xl font-semibold text-white leading-tight">
            Módulo {mod.letter} — {mod.name}
          </h3>
          <p className="text-xs text-white/80 line-clamp-3">{mod.tagline}</p>
        </div>
      </div>
    </Link>
  );
}
