import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PlatformStat = { label: string; value: string };
export type PlatformSummary = {
  toolId: "deepersona" | "creator" | "soma" | "lekpis";
  stats: PlatformStat[];
  updatedAt: string | null;
};

/**
 * Resumo por plataforma integrada (status "ready" no catálogo AEIOU).
 * Retorna 3 métricas curtas por plataforma + updatedAt do registro mais recente.
 */
export const getPlatformSummaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ summaries: PlatformSummary[] }> => {
    const { supabase } = context;
    const org = data.organizationId;
    const head = { count: "exact" as const, head: true };
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const [
      personasTotal,
      personasPrio,
      personasRecent,
      personasLast,
      campaignsTotal,
      campaignsActive,
      campaignsUpcoming,
      campaignsLast,
      projectsActive,
      tasksOpen,
      tasksDone,
      tasksLast,
      kpisTotal,
      kpisAll,
      kpisLast,
    ] = await Promise.all([
      supabase.from("personas").select("id", head).eq("organization_id", org),
      supabase.from("personas").select("id", head).eq("organization_id", org).not("importance", "is", null).not("urgency", "is", null),
      supabase.from("personas").select("id", head).eq("organization_id", org).gte("updated_at", since30),
      supabase.from("personas").select("updated_at").eq("organization_id", org).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("campaigns").select("id", head).eq("organization_id", org),
      supabase.from("campaigns").select("id", head).eq("organization_id", org).eq("status", "active"),
      supabase.from("campaigns").select("id", head).eq("organization_id", org).gte("starts_at", today),
      supabase.from("campaigns").select("updated_at").eq("organization_id", org).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("projects").select("id", head).eq("organization_id", org).neq("status", "done"),
      supabase.from("tasks").select("id", head).eq("organization_id", org).in("status", ["todo", "doing"]),
      supabase.from("tasks").select("id", head).eq("organization_id", org).eq("status", "done"),
      supabase.from("tasks").select("updated_at").eq("organization_id", org).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("kpi_snapshots").select("id", head).eq("organization_id", org),
      supabase.from("kpi_snapshots").select("value, target").eq("organization_id", org),
      supabase.from("kpi_snapshots").select("updated_at").eq("organization_id", org).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const kpiRows = (kpisAll.data ?? []) as Array<{ value: number | null; target: number | null }>;
    const kpiWithTarget = kpiRows.filter((r) => r.target != null && r.value != null);
    const kpiHit = kpiWithTarget.filter((r) => (r.value ?? 0) >= (r.target ?? 0)).length;
    const kpiPct = kpiWithTarget.length ? Math.round((kpiHit / kpiWithTarget.length) * 100) : 0;

    const summaries: PlatformSummary[] = [
      {
        toolId: "deepersona",
        stats: [
          { label: "Personas", value: String(personasTotal.count ?? 0) },
          { label: "Priorizadas", value: String(personasPrio.count ?? 0) },
          { label: "Atualiz. 30d", value: String(personasRecent.count ?? 0) },
        ],
        updatedAt: (personasLast.data as { updated_at?: string } | null)?.updated_at ?? null,
      },
      {
        toolId: "creator",
        stats: [
          { label: "Campanhas", value: String(campaignsTotal.count ?? 0) },
          { label: "Ativas", value: String(campaignsActive.count ?? 0) },
          { label: "Próximas", value: String(campaignsUpcoming.count ?? 0) },
        ],
        updatedAt: (campaignsLast.data as { updated_at?: string } | null)?.updated_at ?? null,
      },
      {
        toolId: "soma",
        stats: [
          { label: "Projetos ativos", value: String(projectsActive.count ?? 0) },
          { label: "Tarefas abertas", value: String(tasksOpen.count ?? 0) },
          { label: "Concluídas", value: String(tasksDone.count ?? 0) },
        ],
        updatedAt: (tasksLast.data as { updated_at?: string } | null)?.updated_at ?? null,
      },
      {
        toolId: "lekpis",
        stats: [
          { label: "Indicadores", value: String(kpisTotal.count ?? 0) },
          { label: "Atingindo meta", value: `${kpiPct}%` },
          { label: "Com meta", value: String(kpiWithTarget.length) },
        ],
        updatedAt: (kpisLast.data as { updated_at?: string } | null)?.updated_at ?? null,
      },
    ];

    return { summaries };
  });


/**
 * Contagens agregadas por módulo para o dashboard Marketing OS.
 */
export const getModulesOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const org = data.organizationId;
    const head = { count: "exact" as const, head: true };

    const [
      personas,
      strategies,
      campaigns,
      projects,
      tasks,
      communities,
      kpis,
      library,
    ] = await Promise.all([
      supabase.from("personas").select("id", head).eq("organization_id", org),
      supabase.from("strategies").select("id", head).eq("organization_id", org),
      supabase.from("campaigns").select("id", head).eq("organization_id", org),
      supabase.from("projects").select("id", head).eq("organization_id", org),
      supabase.from("tasks").select("id", head).eq("organization_id", org),
      supabase.from("communities").select("id", head).eq("organization_id", org),
      supabase.from("kpi_snapshots").select("id", head).eq("organization_id", org),
      supabase.from("library_items").select("id", head).eq("organization_id", org),
    ]);

    return {
      counts: {
        deepersona: personas.count ?? 0,
        estrategia: strategies.count ?? 0,
        creator: campaigns.count ?? 0,
        soma: (projects.count ?? 0) + (tasks.count ?? 0),
        comunidades: communities.count ?? 0,
        lekpis: kpis.count ?? 0,
        biblioteca: library.count ?? 0,
        ia: 0,
      },
    };
  });

/**
 * Lê recomendações ativas (não dispensadas) do copiloto.
 */
export const listCopilotRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows } = await supabase
      .from("copilot_recommendations")
      .select("*")
      .eq("organization_id", data.organizationId)
      .is("dismissed_at", null)
      .order("generated_at", { ascending: false })
      .limit(6);
    return { items: rows ?? [] };
  });

/**
 * Marca uma recomendação como dispensada.
 */
export const dismissRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("copilot_recommendations")
      .update({ dismissed_at: new Date().toISOString(), dismissed_by: userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Gera 3 recomendações contextuais via Lovable AI Gateway (Gemini),
 * usando os contadores atuais do workspace + nome da organização.
 * Persiste no banco e devolve a lista atualizada.
 */
export const generateCopilotRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    void userId;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    // Contexto: nome da org e contagens
    const [{ data: org }, personas, strategies, campaigns, projects, communities] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("name, plan")
          .eq("id", data.organizationId)
          .maybeSingle(),
        supabase.from("personas").select("id", { count: "exact", head: true }).eq("organization_id", data.organizationId),
        supabase.from("strategies").select("id", { count: "exact", head: true }).eq("organization_id", data.organizationId),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("organization_id", data.organizationId),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", data.organizationId),
        supabase.from("communities").select("id", { count: "exact", head: true }).eq("organization_id", data.organizationId),
      ]);

    const ctx = {
      organization: org?.name ?? "workspace",
      counts: {
        personas: personas.count ?? 0,
        strategies: strategies.count ?? 0,
        campaigns: campaigns.count ?? 0,
        projects: projects.count ?? 0,
        communities: communities.count ?? 0,
      },
    };

    // Chama Gemini via Lovable AI Gateway
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const zod = await import("zod");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const schema = zod.z.object({
      recommendations: zod.z
        .array(
          zod.z.object({
            title: zod.z.string(),
            body: zod.z.string(),
            module: zod.z.enum([
              "deepersona",
              "estrategia",
              "creator",
              "soma",
              "comunidades",
              "lekpis",
              "ia",
            ]),
            severity: zod.z.enum(["info", "opportunity", "warning"]),
            action_hint: zod.z.string(),
          }),
        )
        .length(3),
    });

    const system =
      "Você é o copiloto do Marketing OS da LeFil. Analise o estado do workspace e retorne exatamente 3 recomendações curtas, específicas e acionáveis, em português do Brasil. Cada recomendação deve indicar o módulo mais adequado.";

    const prompt =
      `Workspace: ${ctx.organization}\n` +
      `Contadores atuais:\n` +
      `- Personas: ${ctx.counts.personas}\n` +
      `- Estratégias: ${ctx.counts.strategies}\n` +
      `- Campanhas: ${ctx.counts.campaigns}\n` +
      `- Projetos: ${ctx.counts.projects}\n` +
      `- Comunidades: ${ctx.counts.communities}\n\n` +
      `Priorize o próximo passo lógico da jornada (mercado → personas → estratégia → campanha → execução → comunidade → medição). ` +
      `title: até 8 palavras. body: 1-2 frases. action_hint: verbo no imperativo (ex.: "Criar persona").`;

    let recs: z.infer<typeof schema>["recommendations"] = [];

    try {
      const result = await generateText({
        model,
        system,
        prompt,
        output: Output.object({ schema }),
      });
      recs = result.output.recommendations;
    } catch (err: unknown) {
      // Fallback gracioso — nunca deixa o dashboard quebrado.
      if (NoObjectGeneratedError.isInstance(err)) {
        recs = fallbackRecommendations(ctx.counts);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Falha na IA: ${message}`);
      }
    }

    // Persiste (substitui as anteriores não dispensadas para manter fresco)
    await supabase
      .from("copilot_recommendations")
      .delete()
      .eq("organization_id", data.organizationId)
      .is("dismissed_at", null);

    if (recs.length) {
      await supabase.from("copilot_recommendations").insert(
        recs.map((r) => ({
          organization_id: data.organizationId,
          title: r.title,
          body: r.body,
          module: r.module,
          severity: r.severity,
          action_hint: r.action_hint,
        })),
      );
    }

    const { data: rows } = await supabase
      .from("copilot_recommendations")
      .select("*")
      .eq("organization_id", data.organizationId)
      .is("dismissed_at", null)
      .order("generated_at", { ascending: false });

    return { items: rows ?? [] };
  });

function fallbackRecommendations(counts: {
  personas: number;
  strategies: number;
  campaigns: number;
  projects: number;
  communities: number;
}) {
  const list: Array<{
    title: string;
    body: string;
    module:
      | "deepersona"
      | "estrategia"
      | "creator"
      | "soma"
      | "comunidades"
      | "lekpis"
      | "ia";
    severity: "info" | "opportunity" | "warning";
    action_hint: string;
  }> = [];
  if (counts.personas === 0) {
    list.push({
      title: "Comece pelas Personas",
      body: "Nenhuma persona foi criada. Personas guiam toda a estratégia e a produção de conteúdo.",
      module: "deepersona",
      severity: "opportunity",
      action_hint: "Criar persona",
    });
  }
  if (counts.strategies === 0) {
    list.push({
      title: "Defina sua estratégia",
      body: "Sem estratégia, as campanhas ficam sem direção. Comece pelo objetivo e posicionamento.",
      module: "estrategia",
      severity: "opportunity",
      action_hint: "Criar estratégia",
    });
  }
  if (counts.campaigns === 0) {
    list.push({
      title: "Crie sua primeira campanha",
      body: "Transforme a estratégia em campanhas prontas para execução com o Creator.",
      module: "creator",
      severity: "info",
      action_hint: "Abrir Creator",
    });
  }
  return list.slice(0, 3);
}
