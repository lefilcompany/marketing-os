import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, LayoutTemplate, Check } from "lucide-react";
import {
  DASHBOARD_TEMPLATES,
  formatMetric,
  type DashboardTemplate,
  type DashboardMetric,
} from "@/lib/dashboard-templates";
import { listKpisByKeys } from "@/lib/kpis.functions";
import { SeedTemplateButton } from "@/components/seed-template-button";

export const Route = createFileRoute("/_authenticated/lekpis/templates")({
  head: () => ({
    meta: [
      { title: "Templates de dashboard — LeKPIs" },
      {
        name: "description",
        content:
          "Galeria de templates de dashboard multi-plataforma com preview de valor × meta antes de semear no workspace.",
      },
    ],
  }),
  component: LeKpisTemplatesGallery,
});

function LeKpisTemplatesGallery() {
  const { currentOrgId } = useWorkspace();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Módulo · LeKPIs
            </p>
            <Badge variant="secondary" className="text-[10px]">Galeria</Badge>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
            Templates de dashboard
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Explore os 6 modelos prontos, veja o preview de cada card de valor × meta e semeie
            os indicadores no workspace com um clique.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1 shrink-0">
          <Link to="/lekpis">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {DASHBOARD_TEMPLATES.map((t) => (
          <TemplateCard key={t.slug} template={t} orgId={currentOrgId} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  orgId,
}: {
  template: DashboardTemplate;
  orgId: string | null | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = template.icon;

  const keys = useMemo(() => template.metrics.map((m) => m.key), [template]);

  const kpisQ = useQuery({
    queryKey: ["lekpis-template-preview", orgId, template.slug],
    queryFn: () => listKpisByKeys({ data: { organizationId: orgId!, keys } }),
    enabled: !!orgId,
  });

  const byKey = useMemo(() => {
    const map = new Map<string, { value: number | null; target: number | null }>();
    for (const row of (kpisQ.data?.items ?? []) as Array<{
      metric_key: string;
      value: number | null;
      target: number | null;
    }>) {
      map.set(row.metric_key, { value: row.value, target: row.target });
    }
    return map;
  }, [kpisQ.data]);

  const seededCount = byKey.size;
  const total = template.metrics.length;
  const fullySeeded = seededCount >= total;




  const visible = expanded ? template.metrics : template.metrics.slice(0, 4);

  return (
    <section
      className="surface-card p-5 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(80% 60% at 0% 0%, color-mix(in oklab, ${template.color} 12%, transparent), transparent 70%)`,
      }}
    >
      <header className="flex items-start gap-3 mb-4">
        <div
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 shrink-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${template.color} 55%, transparent), color-mix(in oklab, ${template.color} 20%, transparent))`,
          }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold truncate">{template.name}</h2>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {total} métricas
            </Badge>
            {fullySeeded && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Check className="h-3 w-3" /> semeado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.tagline}</p>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((m) => (
          <PreviewMetric
            key={m.key}
            metric={m}
            snapshot={byKey.get(m.key)}
            loading={kpisQ.isLoading}
            color={template.color}
          />
        ))}
      </div>

      {total > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground mt-2 underline-offset-2 hover:underline"
        >
          {expanded ? "Recolher" : `Ver todas as ${total} métricas`}
        </button>
      )}

      <footer className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <LayoutTemplate className="h-3.5 w-3.5" />
          {orgId
            ? kpisQ.isLoading
              ? "Carregando preview…"
              : `${seededCount}/${total} já no workspace`
            : "Selecione um workspace"}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/lekpis">Abrir</Link>
          </Button>
          <SeedTemplateButton
            template={template}
            orgId={orgId}
            existingKeys={new Set(byKey.keys())}
            loadingExisting={kpisQ.isLoading}
            size="sm"
            variant="secondary"
            className="gap-1.5"
          />
        </div>
      </footer>
    </section>
  );
}

function PreviewMetric({
  metric,
  snapshot,
  loading,
  color,
}: {
  metric: DashboardMetric;
  snapshot: { value: number | null; target: number | null } | undefined;
  loading: boolean;
  color: string;
}) {
  const value = snapshot?.value ?? null;
  const target = snapshot?.target ?? metric.target ?? null;
  const pct =
    value != null && target && target > 0
      ? Math.max(0, Math.min(150, (value / target) * 100))
      : null;
  const status = pct == null ? "empty" : pct >= 100 ? "hit" : pct >= 70 ? "on-track" : "off";

  return (
    <div className="rounded-lg border p-3 bg-surface/60">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground truncate">
            {metric.platform}
          </div>
          <div className="text-xs font-medium truncate">{metric.label}</div>
        </div>
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            background:
              status === "hit"
                ? "oklch(0.72 0.18 145)"
                : status === "on-track"
                ? color
                : status === "off"
                ? "oklch(0.7 0.18 25)"
                : "var(--muted-foreground)",
          }}
        />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        {loading ? (
          <Skeleton className="h-5 w-16" />
        ) : (
          <span className="font-display text-base font-semibold">
            {formatMetric(metric, value)}
          </span>
        )}
        {target != null && (
          <span className="text-[10px] text-muted-foreground">
            / {formatMetric(metric, target)}
          </span>
        )}
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct != null ? Math.min(100, pct) : 0}%`,
            background: status === "hit" ? "oklch(0.72 0.18 145)" : color,
          }}
        />
      </div>
    </div>
  );
}
