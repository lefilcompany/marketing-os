import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Lista projetos do workspace. */
export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("projects")
      .select("id, name, status")
      .eq("organization_id", data.organizationId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/** Busca tarefas por ids (com nome do projeto). */
export const listTasksByIds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.ids.length === 0) return { items: [] as Array<{ id: string; title: string; status: string; due_at: string | null; project_id: string | null; project_name: string | null }> };
    const { data: rows, error } = await context.supabase
      .from("tasks")
      .select("id, title, status, due_at, project_id, projects:project_id(name)")
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    const items = (rows ?? []).map((r: { id: string; title: string; status: string; due_at: string | null; project_id: string | null; projects: { name: string } | { name: string }[] | null }) => {
      const proj = Array.isArray(r.projects) ? r.projects[0] : r.projects;
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        due_at: r.due_at,
        project_id: r.project_id,
        project_name: proj?.name ?? null,
      };
    });
    return { items };
  });


/** Cria um projeto. */
export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; name: string; description?: string }) =>
    z.object({
      organizationId: z.string().uuid(),
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("projects")
      .insert({
        organization_id: data.organizationId,
        created_by: context.userId,
        name: data.name,
        description: data.description ?? null,
      })
      .select("id, name, status")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

/**
 * Cria uma tarefa a partir de um insight da persona.
 * Marca o insight com `task_id` para indicar que já foi convertido.
 */
export const createTaskFromInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    personaId: string;
    insightIndex: number;
    projectId: string;
    dueAt?: string | null;
  }) =>
    z.object({
      personaId: z.string().uuid(),
      insightIndex: z.number().int().min(0),
      projectId: z.string().uuid(),
      dueAt: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: persona, error: pErr } = await context.supabase
      .from("personas")
      .select("id, name, organization_id, insights")
      .eq("id", data.personaId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!persona) throw new Error("Persona não encontrada");

    const insights = (persona.insights ?? []) as Array<Record<string, unknown>>;
    const insight = insights[data.insightIndex];
    if (!insight) throw new Error("Insight não encontrado");

    // Idempotência: se o insight já foi convertido, retornar a tarefa existente.
    const existingTaskId = typeof insight.task_id === "string" ? insight.task_id : null;
    if (existingTaskId) {
      const { data: existing, error: exErr } = await context.supabase
        .from("tasks")
        .select("*")
        .eq("id", existingTaskId)
        .maybeSingle();
      if (exErr) throw new Error(exErr.message);
      if (existing) return { task: existing, alreadyExisted: true };
      // Tarefa referenciada foi apagada — limpar marca e permitir recriar.
    }

    const title = String(insight.next_action ?? insight.title ?? "Próxima ação");
    const description =
      `Origem: DeePersona · ${persona.name}\n\n` +
      `Insight: ${String(insight.title ?? "")}\n` +
      `${String(insight.body ?? "")}\n\n` +
      `Próxima ação: ${String(insight.next_action ?? "")}`;

    const { data: task, error: tErr } = await context.supabase
      .from("tasks")
      .insert({
        organization_id: persona.organization_id,
        project_id: data.projectId,
        created_by: context.userId,
        title,
        description,
        status: "todo",
        due_at: data.dueAt ?? null,
      })
      .select("*")
      .single();
    if (tErr) throw new Error(tErr.message);


    // Marca o insight como convertido
    const nextInsights = insights.map((it, idx) =>
      idx === data.insightIndex
        ? { ...it, task_id: task.id, project_id: data.projectId }
        : it,
    );
    const { error: uErr } = await context.supabase
      .from("personas")
      .update({ insights: nextInsights as never })
      .eq("id", data.personaId);
    if (uErr) throw new Error(uErr.message);

    return { task, alreadyExisted: false };
  });

const CSV_HEADERS = ["id", "title", "status", "due_at", "project_id", "project_name", "description"] as const;

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Exporta as tarefas do workspace em CSV (string). */
export const exportTasksCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; projectId?: string | null }) =>
    z.object({
      organizationId: z.string().uuid(),
      projectId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("tasks")
      .select("id, title, status, due_at, project_id, description, projects:project_id(name)")
      .eq("organization_id", data.organizationId)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const lines: string[] = [CSV_HEADERS.join(",")];
    for (const r of rows ?? []) {
      const proj = Array.isArray(r.projects) ? r.projects[0] : r.projects;
      lines.push(
        [
          r.id,
          r.title,
          r.status,
          r.due_at ?? "",
          r.project_id ?? "",
          proj?.name ?? "",
          r.description ?? "",
        ].map(csvEscape).join(","),
      );
    }
    return { csv: lines.join("\n"), count: rows?.length ?? 0 };
  });

/** Parse CSV robusto (RFC 4180 simplificado). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const ALLOWED_STATUSES = new Set(["todo", "in_progress", "blocked", "review", "done"]);

/**
 * Importa atualizações de tarefas via CSV.
 * Regras:
 * - Apenas UPDATE: linhas sem `id` válido são ignoradas (segurança).
 * - Cada tarefa deve pertencer à organização atual.
 * - Campos aceitos para atualização: title, status, due_at, description.
 */
export const importTasksCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; csv: string }) =>
    z.object({
      organizationId: z.string().uuid(),
      csv: z.string().min(1).max(2_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const rows = parseCsv(data.csv);
    if (rows.length < 2) {
      return { updated: 0, skipped: 0, errors: ["CSV vazio ou sem linhas de dados."] };
    }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const iId = col("id");
    if (iId < 0) return { updated: 0, skipped: 0, errors: ["Coluna 'id' obrigatória no cabeçalho."] };
    const iTitle = col("title");
    const iStatus = col("status");
    const iDue = col("due_at");
    const iDesc = col("description");

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const id = (row[iId] ?? "").trim();
      if (!uuidRe.test(id)) { skipped++; continue; }

      const patch: { title?: string; status?: string; due_at?: string | null; description?: string | null } = {};
      if (iTitle >= 0) {
        const t = (row[iTitle] ?? "").trim();
        if (t) patch.title = t.slice(0, 500);
      }
      if (iStatus >= 0) {
        const s = (row[iStatus] ?? "").trim().toLowerCase();
        if (s && ALLOWED_STATUSES.has(s)) patch.status = s;
        else if (s) { errors.push(`Linha ${r + 1}: status inválido "${s}"`); }
      }
      if (iDue >= 0) {
        const d = (row[iDue] ?? "").trim();
        if (d === "") patch.due_at = null;
        else if (isoDateRe.test(d)) patch.due_at = d;
        else errors.push(`Linha ${r + 1}: due_at deve ser YYYY-MM-DD`);
      }
      if (iDesc >= 0) {
        const d = row[iDesc] ?? "";
        patch.description = d.length ? d.slice(0, 10000) : null;
      }
      if (Object.keys(patch).length === 0) { skipped++; continue; }

      const { error, count } = await context.supabase
        .from("tasks")
        .update(patch, { count: "exact" })
        .eq("id", id)
        .eq("organization_id", data.organizationId);
      if (error) { errors.push(`Linha ${r + 1}: ${error.message}`); continue; }
      if ((count ?? 0) > 0) updated++;
      else skipped++;
    }

    return { updated, skipped, errors: errors.slice(0, 20) };
  });
