import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateKpiSnapshot } from "@/lib/kpis.functions";
import type { DashboardMetric } from "@/lib/dashboard-templates";
import { formatMetric } from "@/lib/dashboard-templates";

type EditableSnapshot = {
  id: string;
  label: string | null;
  value: number | null;
  target: number | null;
  unit: string | null;
  period_start: string | null;
  period_end: string | null;
};

type PeriodPreset = "7d" | "30d" | "90d" | "mtd" | "ytd" | "custom";

const PRESETS: { key: PeriodPreset; label: string; days?: number }[] = [
  { key: "7d", label: "Últimos 7 dias", days: 7 },
  { key: "30d", label: "Últimos 30 dias", days: 30 },
  { key: "90d", label: "Últimos 90 dias", days: 90 },
  { key: "mtd", label: "Mês atual" },
  { key: "ytd", label: "Ano atual" },
  { key: "custom", label: "Personalizado" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function firstOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function firstOfYearISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;
}

function computePreset(start: string | null, end: string | null): PeriodPreset {
  if (!start || !end) return "custom";
  if (end !== todayISO()) return "custom";
  const startD = new Date(start);
  const now = new Date();
  const diff = Math.round((now.getTime() - startD.getTime()) / 86400000);
  if (diff === 7) return "7d";
  if (diff === 30) return "30d";
  if (diff === 90) return "90d";
  if (start === firstOfMonthISO()) return "mtd";
  if (start === firstOfYearISO()) return "ytd";
  return "custom";
}

function resolvePreset(preset: PeriodPreset): { start: string; end: string } | null {
  const end = todayISO();
  const p = PRESETS.find((p) => p.key === preset);
  if (!p) return null;
  if (p.days) return { start: daysAgoISO(p.days), end };
  if (preset === "mtd") return { start: firstOfMonthISO(), end };
  if (preset === "ytd") return { start: firstOfYearISO(), end };
  return null;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string;
  metric: DashboardMetric;
  snapshot: EditableSnapshot | undefined;
  /** Chaves de queries a invalidar após salvar. */
  invalidateKeys?: readonly (readonly unknown[])[];
};

export function EditKpiDialog({
  open,
  onOpenChange,
  organizationId,
  metric,
  snapshot,
  invalidateKeys,
}: Props) {
  const qc = useQueryClient();
  const [label, setLabel] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setLabel(snapshot?.label ?? `${metric.label} · ${metric.platform}`);
    setValue(snapshot?.value != null ? String(snapshot.value) : "");
    setTarget(
      snapshot?.target != null
        ? String(snapshot.target)
        : metric.target != null
        ? String(metric.target)
        : "",
    );
    const s = snapshot?.period_start ?? daysAgoISO(30);
    const e = snapshot?.period_end ?? todayISO();
    setStart(s);
    setEnd(e);
    setPreset(computePreset(s, e));
  }, [open, snapshot, metric]);

  const canSave = useMemo(() => {
    if (!label.trim()) return false;
    if (value !== "" && Number.isNaN(Number(value))) return false;
    if (target !== "" && Number.isNaN(Number(target))) return false;
    if (start && end && start > end) return false;
    return true;
  }, [label, value, target, start, end]);

  const onPreset = (p: PeriodPreset) => {
    setPreset(p);
    const range = resolvePreset(p);
    if (range) {
      setStart(range.start);
      setEnd(range.end);
    }
  };

  const saveM = useMutation({
    mutationFn: () =>
      updateKpiSnapshot({
        data: {
          id: snapshot!.id,
          organizationId,
          label: label.trim(),
          target: target === "" ? null : Number(target),
          value: value === "" ? undefined : Number(value),
          periodStart: start || null,
          periodEnd: end || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lekpis"] });
      qc.invalidateQueries({ queryKey: ["lekpis-template-preview"] });
      for (const key of invalidateKeys ?? []) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
      toast.success("Indicador atualizado.");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Falha ao salvar indicador."),
  });

  const disabled = !snapshot || saveM.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => (!saveM.isPending ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar indicador
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {metric.platform}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Ajuste nome, período e meta do indicador gerado pelo template.
          </DialogDescription>
        </DialogHeader>

        {!snapshot ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            Este indicador ainda não foi semeado no workspace. Aplique o template antes de
            editá-lo.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kpi-label">Nome</Label>
              <Input
                id="kpi-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={160}
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kpi-value">Valor atual</Label>
                <Input
                  id="kpi-value"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  disabled={disabled}
                />
                {value !== "" && !Number.isNaN(Number(value)) && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatMetric(metric, Number(value))}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kpi-target">Meta</Label>
                <Input
                  id="kpi-target"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="—"
                  disabled={disabled}
                />
                {target !== "" && !Number.isNaN(Number(target)) && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatMetric(metric, Number(target))}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" /> Período
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPreset(p.key)}
                    className={`text-[11px] rounded-full border px-2.5 py-1 transition-colors ${
                      preset === p.key
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "hover:border-primary/30 text-muted-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="kpi-start" className="text-[11px] text-muted-foreground">
                    Início
                  </Label>
                  <Input
                    id="kpi-start"
                    type="date"
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      setPreset("custom");
                    }}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kpi-end" className="text-[11px] text-muted-foreground">
                    Fim
                  </Label>
                  <Input
                    id="kpi-end"
                    type="date"
                    value={end}
                    onChange={(e) => {
                      setEnd(e.target.value);
                      setPreset("custom");
                    }}
                    disabled={disabled}
                  />
                </div>
              </div>
              {start && end && start > end && (
                <p className="text-[11px] text-destructive">
                  A data inicial precisa ser anterior à final.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saveM.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveM.mutate()}
            disabled={!canSave || disabled}
            className="gap-1.5"
          >
            {saveM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveM.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
