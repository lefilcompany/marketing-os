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

    return { task };
  });
