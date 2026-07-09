import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type SearchHit = {
  id: string;
  module: "deepersona" | "creator" | "soma" | "lekpis";
  kind: string; // e.g. "persona", "campaign", "task", "project", "kpi", "insight"
  title: string;
  subtitle?: string | null;
  route: string;
};

const escapeLike = (s: string) => s.replace(/[%_,]/g, (m) => `\\${m}`);

/**
 * Busca unificada em Creator (campaigns), Soma (projects+tasks),
 * LeKPIs (kpi_snapshots) e DeePersona (personas + insights).
 * Retorna resultados agrupados por módulo, limitados por relevância.
 */
export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; q: string; limit?: number }) =>
    z.object({
      organizationId: z.string().uuid(),
      q: z.string().trim().min(1).max(120),
      limit: z.number().int().min(1).max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const orgId = data.organizationId;
    const q = data.q;
    const like = `%${escapeLike(q)}%`;
    const limit = data.limit ?? 6;

    const [personasR, campaignsR, projectsR, tasksR, kpisR] = await Promise.all([
      supabase
        .from("personas")
        .select("id, name, role, stage, insights")
        .eq("organization_id", orgId)
        .or(`name.ilike.${like},role.ilike.${like},description.ilike.${like}`)
        .limit(limit),
      supabase
        .from("campaigns")
        .select("id, name, objective, channel, status")
        .eq("organization_id", orgId)
        .or(`name.ilike.${like},objective.ilike.${like},channel.ilike.${like}`)
        .limit(limit),
      supabase
        .from("projects")
        .select("id, name, description, status")
        .eq("organization_id", orgId)
        .or(`name.ilike.${like},description.ilike.${like}`)
        .limit(limit),
      supabase
        .from("tasks")
        .select("id, title, status, project_id, projects:project_id(name)")
        .eq("organization_id", orgId)
        .ilike("title", like)
        .limit(limit),
      supabase
        .from("kpi_snapshots")
        .select("id, label, metric_key, module, value, unit")
        .eq("organization_id", orgId)
        .or(`label.ilike.${like},metric_key.ilike.${like}`)
        .limit(limit),
    ]);

    const hits: SearchHit[] = [];

    // Personas
    for (const p of personasR.data ?? []) {
      hits.push({
        id: p.id,
        module: "deepersona",
        kind: "persona",
        title: p.name,
        subtitle: [p.role, p.stage].filter(Boolean).join(" · ") || null,
        route: `/deepersona/${p.id}`,
      });
      // Insights embutidos
      const insights = Array.isArray(p.insights) ? p.insights : [];
      const needle = q.toLowerCase();
      insights.forEach((ins: unknown, idx: number) => {
        if (!ins || typeof ins !== "object") return;
        const rec = ins as Record<string, unknown>;
        const text = [rec.title, rec.summary, rec.next_action]
          .filter((v): v is string => typeof v === "string")
          .join(" \n ");
        if (text.toLowerCase().includes(needle)) {
          hits.push({
            id: `${p.id}:${idx}`,
            module: "deepersona",
            kind: "insight",
            title: (typeof rec.title === "string" && rec.title) || "Insight",
            subtitle: `Persona: ${p.name}`,
            route: `/deepersona/${p.id}`,
          });
        }
      });
    }

    // Campaigns → Creator
    for (const c of campaignsR.data ?? []) {
      hits.push({
        id: c.id,
        module: "creator",
        kind: "campaign",
        title: c.name,
        subtitle: [c.channel, c.status].filter(Boolean).join(" · ") || c.objective || null,
        route: `/creator`,
      });
    }

    // Projects → Soma
    for (const p of projectsR.data ?? []) {
      hits.push({
        id: p.id,
        module: "soma",
        kind: "project",
        title: p.name,
        subtitle: p.status || p.description || null,
        route: `/soma`,
      });
    }

    // Tasks → Soma
    for (const t of tasksR.data ?? []) {
      const proj = Array.isArray(t.projects) ? t.projects[0] : t.projects;
      hits.push({
        id: t.id,
        module: "soma",
        kind: "task",
        title: t.title,
        subtitle: [proj?.name, t.status].filter(Boolean).join(" · ") || null,
        route: `/soma`,
      });
    }

    // KPIs → LeKPIs
    for (const k of kpisR.data ?? []) {
      hits.push({
        id: k.id,
        module: "lekpis",
        kind: "kpi",
        title: k.label || k.metric_key,
        subtitle: [k.module, k.value != null ? `${k.value}${k.unit ?? ""}` : null]
          .filter(Boolean)
          .join(" · ") || null,
        route: `/lekpis`,
      });
    }

    return { hits, query: q };
  });
