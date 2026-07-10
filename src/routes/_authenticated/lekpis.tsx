import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, RefreshCw, LayoutTemplate, Grid3x3 } from "lucide-react";
import {
  DASHBOARD_TEMPLATES,
  formatMetric,
  getTemplate,
  type DashboardMetric,
} from "@/lib/dashboard-templates";
import { listKpisByKeys } from "@/lib/kpis.functions";
import { SeedTemplateButton } from "@/components/seed-template-button";
import { EditKpiDialog } from "@/components/edit-kpi-dialog";
import { Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lekpis")({
  head: () => ({ meta: [{ title: "LeKPIs — Marketing OS" }] }),
  component: LeKpisPage,
});

function LeKpisPage() {
  const [templateSlug, setTemplateSlug] = useState<string>(DASHBOARD_TEMPLATES[0].slug);
  const template = getTemplate(templateSlug)!;
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();

  const keys = useMemo(() => template.metrics.map((m) => m.key), [template]);

  const kpisQ = useQuery({
    queryKey: ["lekpis", currentOrgId, templateSlug],
    queryFn: () => listKpisByKeys({ data: { organizationId: currentOrgId!, keys } }),
    enabled: !!currentOrgId,
  });

  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const row of (kpisQ.data?.items ?? []) as Array<{ metric_key: string }>) {
      set.add(row.metric_key);
    }
    return set;
  }, [kpisQ.data]);


  type SnapshotRow = {
    id: string;
    metric_key: string;
    label: string | null;
    value: number | null;
    target: number | null;
    unit: string | null;
    period_start: string | null;
    period_end: string | null;
    updated_at: string | null;
  };
  const byKey = useMemo(() => {
    const map = new Map<string, SnapshotRow>();
    for (const row of (kpisQ.data?.items ?? []) as SnapshotRow[]) {
      map.set(row.metric_key, row);
    }
    return map;
  }, [kpisQ.data]);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editingMetric = useMemo(
    () => template.metrics.find((m) => m.key === editingKey) ?? null,
    [editingKey, template.metrics],
  );
  const editingSnapshot = editingKey ? byKey.get(editingKey) : undefined;

  return (
    <>
      <ModulePlatformShell module={getModule("lekpis")!} />
      <div className="relative min-h-[calc(100vh-4rem)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10 opacity-50"
        style={{
          background: `radial-gradient(60% 100% at 20% 0%, color-mix(in oklab, ${template.color} 30%, transparent), transparent 70%)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-start gap-5">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 shadow-elevated"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${template.color} 55%, transparent), color-mix(in oklab, ${template.color} 20%, transparent))`,
            }}
          >
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Módulo · LeKPIs
              </p>
              <Badge variant="secondary" className="text-[10px]">Templates</Badge>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              Dashboards multi-plataforma
            </h1>
            <p className="text-muted-foreground mt-1">
              Combine métricas de mídia, CRM, site, e-mail e financeiro em uma única visão pronta.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/lekpis/templates">
                <Grid3x3 className="h-4 w-4" />
                Ver galeria
              </Link>
            </Button>
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/lekpis/templates">
                <Grid3x3 className="h-4 w-4" />
                Ver galeria
              </Link>
            </Button>
            <SeedTemplateButton
              template={template}
              orgId={currentOrgId}
              existingKeys={existingKeys}
              loadingExisting={kpisQ.isLoading}
              invalidateKeys={[["lekpis", currentOrgId, templateSlug]]}
            />
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {DASHBOARD_TEMPLATES.map((t) => {
            const active = t.slug === templateSlug;
            const Icon = t.icon;
            return (
              <button
                key={t.slug}
                onClick={() => setTemplateSlug(t.slug)}
                className={`group relative rounded-xl border p-3 text-left transition-all ${
                  active ? "border-primary/60" : "hover:border-primary/30"
                }`}
                style={active ? { boxShadow: `0 12px 40px -18px ${t.color}` } : undefined}
              >
                <div
                  className="grid h-8 w-8 place-items-center rounded-lg mb-2"
                  style={{ background: `color-mix(in oklab, ${t.color} 30%, transparent)` }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm font-medium leading-tight">{t.name}</div>
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{t.tagline}</p>
                {active && (
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full"
                        style={{ background: t.color }} />
                )}
              </button>
            );
          })}
        </section>

        <section className="surface-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-lg font-semibold">{template.name}</h2>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {template.metrics.length} métricas
              </Badge>
            </div>
            <Button size="sm" variant="ghost" className="gap-1"
                    onClick={() => qc.invalidateQueries({ queryKey: ["lekpis", currentOrgId, templateSlug] })}>
              <RefreshCw className={`h-3.5 w-3.5 ${kpisQ.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {template.metrics.map((m) => (
              <MetricCard
                key={m.key}
                metric={m}
                snapshot={byKey.get(m.key)}
                loading={kpisQ.isLoading}
                color={template.color}
                onEdit={byKey.has(m.key) ? () => setEditingKey(m.key) : undefined}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-5">
            Sem dados? Clique em <span className="font-medium">Aplicar template</span> para criar os
            indicadores no workspace — depois clique em cada indicador para editar nome, período e meta.
          </p>
        </section>
      </div>

      {editingMetric && currentOrgId && (
        <EditKpiDialog
          open={!!editingKey}
          onOpenChange={(v) => !v && setEditingKey(null)}
          organizationId={currentOrgId}
          metric={editingMetric}
          snapshot={editingSnapshot}
          invalidateKeys={[["lekpis", currentOrgId, templateSlug]]}
        />
      )}
    </div>
    </>
  );
}

function MetricCard({
  metric, snapshot, loading, color, onEdit,
}: {
  metric: DashboardMetric;
  snapshot:
    | {
        label?: string | null;
        value: number | null;
        target: number | null;
        updated_at: string | null;
        period_start?: string | null;
        period_end?: string | null;
      }
    | undefined;
  loading: boolean;
  color: string;
  onEdit?: () => void;
}) {
  const value = snapshot?.value ?? null;
  const target = snapshot?.target ?? metric.target ?? null;
  const displayLabel = snapshot?.label ?? metric.label;
  const pct = value != null && target && target > 0
    ? Math.max(0, Math.min(150, (value / target) * 100))
    : null;
  const status = pct == null ? "empty" : pct >= 100 ? "hit" : pct >= 70 ? "on-track" : "off";

  const periodLabel = snapshot?.period_start && snapshot?.period_end
    ? formatPeriod(snapshot.period_start, snapshot.period_end)
    : null;

  return (
    <div className={`group rounded-xl border p-4 bg-surface/60 relative ${onEdit ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
         onClick={onEdit}
         role={onEdit ? "button" : undefined}
         tabIndex={onEdit ? 0 : undefined}
         onKeyDown={onEdit ? (e) => { if (e.key === "Enter") onEdit(); } : undefined}>
      {onEdit && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 grid place-items-center rounded-md hover:bg-muted"
          aria-label="Editar indicador"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {metric.platform}
          </div>
          <div className="text-sm font-medium truncate">{displayLabel}</div>
        </div>
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{
            background:
              status === "hit" ? "oklch(0.72 0.18 145)" :
              status === "on-track" ? color :
              status === "off" ? "oklch(0.7 0.18 25)" :
              "var(--muted-foreground)",
          }}
          title={status}
        />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="font-display text-2xl font-semibold">
            {formatMetric(metric, value)}
          </span>
        )}
        {target != null && (
          <span className="text-[11px] text-muted-foreground">
            meta {formatMetric(metric, target)}
          </span>
        )}
      </div>
      {periodLabel && (
        <div className="mt-1 text-[10px] text-muted-foreground">Período · {periodLabel}</div>
      )}
      {pct != null && (
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, pct)}%`,
              background: status === "hit" ? "oklch(0.72 0.18 145)" : color,
            }}
          />
        </div>
      )}
    </div>
  );
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (end === today) {
    const diff = Math.round((now.getTime() - s.getTime()) / 86400000);
    if (diff === 7) return "últimos 7 dias";
    if (diff === 30) return "últimos 30 dias";
    if (diff === 90) return "últimos 90 dias";
  }
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt.format(s)} – ${fmt.format(e)}`;
}
