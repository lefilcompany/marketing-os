import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  RefreshCcw,
  Loader2,
  Target,
  Info,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useWorkspace } from "@/lib/workspace-context";
import {
  lekpisGetDashboard,
  lekpisGetMetricSeries,
  lekpisSyncMetrics,
  lekpisUpdateMetricTarget,
} from "@/lib/lekpis-mcp.functions";
import { unwrapMcpToolResult } from "@/lib/lekpis-mcp.utils";
import {
  METRIC_CATEGORIES,
  categoryHasMetrics,
  formatMetricValue,
  getMetricEntry,
  type MetricCategoryId,
} from "@/lib/lekpis-mcp.registry";

type Period = "7d" | "30d" | "this_month" | "last_month";

function periodToDates(p: Period): { start: string; end: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = iso(today);
  if (p === "7d") {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { start: iso(s), end };
  }
  if (p === "30d") {
    const s = new Date(today);
    s.setDate(s.getDate() - 29);
    return { start: iso(s), end };
  }
  if (p === "this_month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: iso(s), end };
  }
  // last_month
  const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const e = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: iso(s), end: iso(e) };
}

type NormalizedMetric = {
  key: string;
  value: number | null | undefined;
  currency?: string;
  target: number | null | undefined;
  provider?: string;
  hasData?: boolean;
  updatedAt?: string;
};

function normalizeDashboard(raw: unknown): {
  metrics: NormalizedMetric[];
  currency?: string;
  updatedAt?: string;
} {
  const u = unwrapMcpToolResult<Record<string, unknown>>(raw);
  if (!u.ok) return { metrics: [] };
  const data = u.data ?? {};
  const list =
    ((data as { metrics?: unknown[] }).metrics as unknown[]) ??
    ((data as { items?: unknown[] }).items as unknown[]) ??
    [];
  const metrics = list
    .filter((it) => typeof it === "object" && it !== null)
    .map((it) => {
      const r = it as Record<string, unknown>;
      const rawKey = String(r.key ?? r.metric ?? r.name ?? "").trim();
      const value =
        typeof r.value === "number"
          ? (r.value as number)
          : r.value === null
            ? null
            : undefined;
      const target =
        typeof r.target === "number"
          ? (r.target as number)
          : r.target === null
            ? null
            : undefined;
      const hasData =
        typeof r.has_data === "boolean"
          ? (r.has_data as boolean)
          : typeof r.hasData === "boolean"
            ? (r.hasData as boolean)
            : undefined;
      return {
        key: rawKey,
        value,
        target,
        currency: r.currency as string | undefined,
        provider: r.provider as string | undefined,
        hasData,
        updatedAt:
          (r.updated_at as string | undefined) ??
          (r.last_updated_at as string | undefined),
      };
    })
    .filter((m) => m.key);
  return {
    metrics,
    currency: (data as { currency?: string }).currency,
    updatedAt: (data as { updated_at?: string }).updated_at,
  };
}

export function LekpisSyncDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { currentOrgId } = useWorkspace();
  const syncFn = useServerFn(lekpisSyncMetrics);
  const qc = useQueryClient();
  const [period, setPeriod] = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const dates = useCustom
    ? { start: customStart, end: customEnd }
    : periodToDates(period);

  const mut = useMutation({
    mutationFn: async () => {
      if (useCustom) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dates.start) || !/^\d{4}-\d{2}-\d{2}$/.test(dates.end))
          throw new Error("Datas em formato inválido. Use AAAA-MM-DD.");
        if (dates.start > dates.end) throw new Error("Data inicial maior que a final.");
      }
      const res = await syncFn({
        data: {
          workspaceId: currentOrgId ?? null,
          startDate: dates.start,
          endDate: dates.end,
        },
      });
      const u = unwrapMcpToolResult<Record<string, unknown>>(res.result);
      if (!u.ok) throw new Error(u.error);
      return u.data;
    },
    onSuccess: () => {
      toast.success("Sincronização solicitada. O LeKPIs está processando os dados.");
      qc.invalidateQueries({ queryKey: ["lekpis", "dashboard"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sincronizar métricas</DialogTitle>
          <DialogDescription>
            Solicita ao LeKPIs uma coleta das métricas no período escolhido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="w-24">Período</Label>
            <Select
              value={useCustom ? "custom" : period}
              onValueChange={(v) => {
                if (v === "custom") setUseCustom(true);
                else {
                  setUseCustom(false);
                  setPeriod(v as Period);
                }
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="this_month">Mês atual</SelectItem>
                <SelectItem value="last_month">Mês anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {useCustom && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Intervalo: <code>{dates.start || "—"}</code> a <code>{dates.end || "—"}</code>
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="gap-2">
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Solicitar sincronização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LekpisDashboard({ enabled }: { enabled: boolean }) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const getDashFn = useServerFn(lekpisGetDashboard);

  const [period, setPeriod] = useState<Period>("30d");
  const [category, setCategory] = useState<MetricCategoryId>("performance");
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [targetOpen, setTargetOpen] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const dates = periodToDates(period);
  const dashboardQuery = useQuery({
    queryKey: ["lekpis", "dashboard", currentOrgId, dates.start, dates.end],
    queryFn: () =>
      getDashFn({
        data: {
          workspaceId: currentOrgId ?? null,
          startDate: dates.start,
          endDate: dates.end,
        },
      }),
    enabled: enabled && !!currentOrgId,
  });

  const dash = useMemo(
    () => normalizeDashboard(dashboardQuery.data?.result),
    [dashboardQuery.data],
  );

  const metricsByCategory = useMemo(() => {
    const map = new Map<MetricCategoryId, NormalizedMetric[]>();
    for (const m of dash.metrics) {
      const entry = getMetricEntry(m.key);
      if (!entry) continue;
      const arr = map.get(entry.category) ?? [];
      arr.push(m);
      map.set(entry.category, arr);
    }
    return map;
  }, [dash.metrics]);

  const detailMetric = detailKey
    ? dash.metrics.find((m) => m.key === detailKey) ?? null
    : null;

  if (!enabled) {
    return (
      <div className="surface-card p-8 text-center space-y-2">
        <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Conclua a conexão do LeKPIs para visualizar os indicadores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="this_month">Mês atual</SelectItem>
              <SelectItem value="last_month">Mês anterior</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSyncOpen(true)}
            className="gap-2"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Sincronizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              qc.invalidateQueries({ queryKey: ["lekpis", "dashboard"] })
            }
            disabled={dashboardQuery.isFetching}
            className="gap-2"
          >
            {dashboardQuery.isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Category navigation */}
      <nav className="flex gap-2 overflow-x-auto pb-2">
        {METRIC_CATEGORIES.map((c) => {
          const active = category === c.id;
          const has = categoryHasMetrics(c.id);
          const count = metricsByCategory.get(c.id)?.length ?? 0;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-xl border px-4 py-2 text-left transition ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-border/60 hover:bg-muted/50"
              } ${!has ? "opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.label}</span>
                {!has && (
                  <Badge variant="secondary" className="text-[10px]">
                    Em breve
                  </Badge>
                )}
                {has && count > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {count}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground max-w-[220px] truncate">
                {c.description}
              </p>
            </button>
          );
        })}
      </nav>

      {/* Grid */}
      {dashboardQuery.isLoading ? (
        <div className="surface-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando indicadores…
        </div>
      ) : dashboardQuery.isError ? (
        <div className="surface-card p-6 space-y-2">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <Info className="h-4 w-4" /> Não foi possível carregar os indicadores.
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => dashboardQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !categoryHasMetrics(category) ? (
        <div className="surface-card p-8 text-center text-sm text-muted-foreground">
          Ainda não há fontes compatíveis para esta categoria.
        </div>
      ) : (
        <MetricGrid
          metrics={metricsByCategory.get(category) ?? []}
          currency={dash.currency}
          onOpenDetail={setDetailKey}
          onEditTarget={setTargetOpen}
        />
      )}

      <MetricDetailDrawer
        metricKey={detailMetric?.key ?? null}
        currency={dash.currency}
        period={period}
        onClose={() => setDetailKey(null)}
      />
      <MetricTargetDialog
        metricKey={targetOpen}
        currentTarget={
          targetOpen ? dash.metrics.find((m) => m.key === targetOpen)?.target ?? null : null
        }
        onClose={() => setTargetOpen(null)}
      />
      <LekpisSyncDialog open={syncOpen} onOpenChange={setSyncOpen} />
    </div>
  );
}

function MetricGrid({
  metrics,
  currency,
  onOpenDetail,
  onEditTarget,
}: {
  metrics: NormalizedMetric[];
  currency?: string;
  onOpenDetail: (k: string) => void;
  onEditTarget: (k: string) => void;
}) {
  if (metrics.length === 0) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        Ainda não há dados para este período. Solicite uma sincronização para começar.
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((m) => {
        const entry = getMetricEntry(m.key)!;
        const cur = m.currency ?? currency;
        const valueLabel =
          m.hasData === false
            ? "—"
            : formatMetricValue(m.value ?? null, entry.format, cur);
        const targetLabel =
          m.target === null || m.target === undefined
            ? "—"
            : formatMetricValue(m.target, entry.format, cur);
        return (
          <article key={m.key} className="surface-card p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {m.provider ?? "—"}
                </div>
                <h3 className="font-medium">{entry.label}</h3>
              </div>
              {m.hasData === false && (
                <Badge variant="outline" className="text-[10px]">
                  sem dados
                </Badge>
              )}
            </div>
            <div className="text-2xl font-semibold">{valueLabel}</div>
            <div className="text-xs text-muted-foreground">
              Meta: <span className="font-medium">{targetLabel}</span>
            </div>
            {m.updatedAt && (
              <div className="text-[10px] text-muted-foreground">
                Atualizado {new Date(m.updatedAt).toLocaleString("pt-BR")}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => onOpenDetail(m.key)}>
                Detalhes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditTarget(m.key)}
                className="gap-1"
              >
                <Target className="h-3.5 w-3.5" /> Meta
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MetricDetailDrawer({
  metricKey,
  currency,
  period,
  onClose,
}: {
  metricKey: string | null;
  currency?: string;
  period: Period;
  onClose: () => void;
}) {
  const { currentOrgId } = useWorkspace();
  const getSeriesFn = useServerFn(lekpisGetMetricSeries);
  const dates = periodToDates(period);

  const query = useQuery({
    queryKey: ["lekpis", "series", currentOrgId, metricKey, dates.start, dates.end],
    queryFn: () =>
      getSeriesFn({
        data: {
          workspaceId: currentOrgId ?? null,
          metric: metricKey!,
          startDate: dates.start,
          endDate: dates.end,
        },
      }),
    enabled: !!metricKey && !!currentOrgId,
  });

  const points = useMemo(() => {
    if (!query.data?.result) return [];
    const u = unwrapMcpToolResult<Record<string, unknown>>(query.data.result);
    if (!u.ok) return [];
    const arr =
      ((u.data as { series?: unknown[] }).series as unknown[]) ??
      ((u.data as { points?: unknown[] }).points as unknown[]) ??
      [];
    return arr
      .map((p) => {
        const r = p as Record<string, unknown>;
        const date = String(r.date ?? r.day ?? r.timestamp ?? "");
        const value = typeof r.value === "number" ? (r.value as number) : null;
        return { date, value };
      })
      .filter((p) => p.date);
  }, [query.data]);

  const entry = metricKey ? getMetricEntry(metricKey) : undefined;

  return (
    <Drawer open={!!metricKey} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{entry?.label ?? metricKey ?? "Métrica"}</DrawerTitle>
          <DrawerDescription>
            Série temporal diária • {dates.start} a {dates.end}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-6 pb-4">
          {query.isLoading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando série…
            </div>
          ) : query.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível carregar a série temporal.
            </p>
          ) : points.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sem dados para o período.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) =>
                      entry
                        ? formatMetricValue(v, entry.format, currency)
                        : String(v)
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function MetricTargetDialog({
  metricKey,
  currentTarget,
  onClose,
}: {
  metricKey: string | null;
  currentTarget: number | null;
  onClose: () => void;
}) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const updateFn = useServerFn(lekpisUpdateMetricTarget);
  const [text, setText] = useState("");

  const entry = metricKey ? getMetricEntry(metricKey) : undefined;

  const mut = useMutation({
    mutationFn: async () => {
      if (!metricKey) return;
      const normalized = text.replace(/\./g, "").replace(",", ".");
      const n = Number(normalized);
      if (!Number.isFinite(n)) throw new Error("Valor inválido.");
      await updateFn({
        data: { workspaceId: currentOrgId ?? null, metric: metricKey, target: n },
      });
    },
    onSuccess: () => {
      toast.success("Meta atualizada.");
      qc.invalidateQueries({ queryKey: ["lekpis", "dashboard"] });
      onClose();
      setText("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog
      open={!!metricKey}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setText("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta de {entry?.label ?? metricKey}</DialogTitle>
          <DialogDescription>
            Meta atual:{" "}
            {currentTarget === null || currentTarget === undefined
              ? "—"
              : formatMetricValue(currentTarget, entry?.format ?? "integer", undefined)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="target-input">Novo valor</Label>
          <Input
            id="target-input"
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: 1.500,00"
          />
          {entry?.format === "percent" && (
            <p className="text-xs text-muted-foreground">
              Aceita valor percentual (ex: 2,5 para 2,5%).
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mut.mutate()}
            disabled={!text || mut.isPending}
            className="gap-2"
          >
            {mut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar meta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
