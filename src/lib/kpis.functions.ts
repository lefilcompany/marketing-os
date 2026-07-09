import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Busca snapshots por chave (para popular um template de dashboard). */
export const listKpisByKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; keys: string[] }) =>
    z.object({
      organizationId: z.string().uuid(),
      keys: z.array(z.string().min(1).max(80)).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    type KpiRow = {
      id: string;
      metric_key: string;
      label: string | null;
      value: number | null;
      target: number | null;
      unit: string | null;
      module: string | null;
      period_start: string | null;
      period_end: string | null;
      updated_at: string | null;
    };
    if (data.keys.length === 0) return { items: [] as KpiRow[] };
    const { data: rows, error } = await context.supabase
      .from("kpi_snapshots")
      .select("id, metric_key, label, value, target, unit, module, period_start, period_end, updated_at")
      .eq("organization_id", data.organizationId)
      .in("metric_key", data.keys)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const latest = new Map<string, KpiRow>();
    for (const r of (rows ?? []) as KpiRow[]) {
      if (!latest.has(r.metric_key)) latest.set(r.metric_key, r);
    }
    return { items: Array.from(latest.values()) };
  });

/**
 * Cria snapshots vazios (value=0, target opcional) para as métricas de um
 * template que ainda não existem no workspace. Facilita começar do zero.
 */
export const seedTemplateKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    organizationId: string;
    module: string;
    metrics: Array<{ key: string; label: string; unit: string; target?: number | null }>;
  }) =>
    z.object({
      organizationId: z.string().uuid(),
      module: z.string().min(1).max(40),
      metrics: z.array(z.object({
        key: z.string().min(1).max(80),
        label: z.string().min(1).max(120),
        unit: z.string().max(20),
        target: z.number().nullable().optional(),
      })).min(1).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const keys = data.metrics.map((m) => m.key);
    const { data: existing, error: eErr } = await context.supabase
      .from("kpi_snapshots")
      .select("metric_key")
      .eq("organization_id", data.organizationId)
      .in("metric_key", keys);
    if (eErr) throw new Error(eErr.message);
    const have = new Set((existing ?? []).map((r) => r.metric_key));
    const toInsert = data.metrics
      .filter((m) => !have.has(m.key))
      .map((m) => ({
        organization_id: data.organizationId,
        metric_key: m.key,
        label: m.label,
        value: 0,
        target: m.target ?? null,
        unit: m.unit || null,
        module: data.module,
      }));
    if (toInsert.length === 0) return { inserted: 0 };
    const { error } = await context.supabase.from("kpi_snapshots").insert(toInsert);
    if (error) throw new Error(error.message);
    return { inserted: toInsert.length };
  });
