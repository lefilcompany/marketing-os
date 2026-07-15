import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import {
  getPlatformSummaries,
  type PlatformSummary,
} from "@/lib/modules.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { AEIOU_MODULES, type AeiouModule, type AeiouTool } from "@/lib/aeiou-modules";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Clock3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboards")({
  head: () => ({ meta: [{ title: "Dashboards — Marketing OS" }] }),
  component: Dashboards,
});

type Entry = {
  tool: AeiouTool;
  module: AeiouModule;
};

function Dashboards() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({
    queryKey: ["session-bootstrap"],
    queryFn: () => getSessionBootstrap(),
  });
  const overview = useQuery({
    queryKey: ["platform-summaries", currentOrgId],
    queryFn: () =>
      getPlatformSummaries({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const orgName = boot.data?.memberships.find(
    (m) => m.organization?.id === currentOrgId,
  )?.organization?.name;

  const entries: Entry[] = AEIOU_MODULES.flatMap((m) =>
    m.tools.map((t) => ({ tool: t, module: m })),
  );
  const summaryMap = new Map<string, PlatformSummary>(
    (overview.data?.summaries ?? []).map((s) => [s.toolId, s]),
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F6F9FC]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-12">
        <header className="mb-8 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Marketing OS · LeFil{orgName ? ` · ${orgName}` : ""}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Dashboards
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Resumo de dados das plataformas integradas ao Marketing OS.
          </p>
        </header>

        <section
          aria-label="Plataformas"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {entries.map(({ tool, module: mod }) => (
            <PlatformCard
              key={tool.id}
              tool={tool}
              module={mod}
              summary={summaryMap.get(tool.id)}
              loading={overview.isLoading}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function PlatformCard({
  tool,
  module: mod,
  summary,
  loading,
}: {
  tool: AeiouTool;
  module: AeiouModule;
  summary: PlatformSummary | undefined;
  loading: boolean;
}) {
  const Icon = tool.icon;
  const isReady = tool.status === "ready";

  return (
    <Link
      to="/modulo/$letra"
      params={{ letra: mod.letter }}
      className={`group relative block overflow-hidden rounded-2xl bg-white border border-border/70 text-left shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isReady ? "hover:-translate-y-0.5 hover:shadow-lg" : "opacity-90"
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: mod.color }}
      />

      <div className="relative z-10 flex h-full flex-col gap-5 p-6 pt-7">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="grid h-11 w-11 place-items-center rounded-xl shrink-0"
              style={{
                background: `color-mix(in oklab, ${mod.color} 14%, white)`,
                color: mod.color,
              }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                Módulo {mod.letter} · {mod.name}
              </p>
              <h3 className="font-display text-lg font-semibold text-foreground leading-tight mt-0.5">
                {tool.name}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {tool.description}
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
        </div>

        {isReady ? (
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-border/60">
            {loading || !summary
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="pt-3">
                    <Skeleton className="h-7 w-12" />
                    <Skeleton className="mt-1.5 h-3 w-16" />
                  </div>
                ))
              : summary.stats.map((s) => (
                  <div key={s.label} className="pt-3">
                    <div className="font-display text-2xl font-semibold text-foreground leading-none">
                      {s.value}
                    </div>
                    <div className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                ))}
          </div>
        ) : (
          <div className="pt-3 border-t border-border/60">
            <Badge
              variant="outline"
              className="gap-1.5 text-[10px] font-medium text-muted-foreground"
            >
              <Clock3 className="h-3 w-3" />
              Aguardando integração
            </Badge>
          </div>
        )}

        {isReady && summary?.updatedAt && (
          <p className="text-[10px] text-muted-foreground -mt-2">
            Atualizado {formatRelative(summary.updatedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}
