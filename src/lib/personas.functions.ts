import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * DeePersona — Persona Viva
 * Etapas: draft → base → icp → journey → insights → live
 * ============================================================ */

const StageEnum = z.enum(["draft", "base", "icp", "journey", "insights", "live"]);

/** Lista personas do workspace (ordenadas por atualização). */
export const listPersonas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("personas")
      .select("*")
      .eq("organization_id", data.organizationId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/** Persona detalhada. */
export const getPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("personas")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Persona não encontrada");
    return { item: row };
  });

/** Cria persona base (manual ou como esqueleto para IA). */
export const createPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    organizationId: string;
    name: string;
    role?: string;
    description?: string;
  }) =>
    z.object({
      organizationId: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      role: z.string().trim().max(120).optional(),
      description: z.string().trim().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("personas")
      .insert({
        organization_id: data.organizationId,
        created_by: context.userId,
        name: data.name,
        role: data.role ?? null,
        description: data.description ?? null,
        avatar_seed: data.name.toLowerCase().replace(/\s+/g, "-"),
        stage: "draft",
        status: "draft",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

/** Atualiza campos livres da persona. */
export const updatePersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    patch: Record<string, unknown>;
    stage?: string;
  }) =>
    z.object({
      id: z.string().uuid(),
      patch: z.record(z.string(), z.unknown()),
      stage: StageEnum.optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { ...data.patch };
    if (data.stage) patch.stage = data.stage;
    const { data: row, error } = await context.supabase
      .from("personas")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

/** Remove persona. */
export const deletePersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("personas")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================
 * IA — Geração assistida por Gemini via Lovable AI Gateway
 * ============================================================ */

async function callAI<T extends z.ZodType>(
  system: string,
  prompt: string,
  schema: T,
): Promise<z.infer<T>> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const { generateText, Output } = await import("ai");
  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-3-flash-preview");
  const result = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
  });
  return result.output as z.infer<T>;
}

const BaseSchema = z.object({
  description: z.string(),
  role: z.string(),
  demographics: z.object({
    age_range: z.string(),
    gender: z.string(),
    location: z.string(),
    income: z.string(),
    education: z.string(),
    family: z.string(),
  }),
  pains: z.array(z.string()),
  gains: z.array(z.string()),
  channels: z.array(z.string()),
});

/** Gera esqueleto completo (base) da persona a partir de um briefing curto. */
export const generatePersonaBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; briefing: string }) =>
    z.object({
      id: z.string().uuid(),
      briefing: z.string().trim().min(4).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: persona } = await context.supabase
      .from("personas").select("name").eq("id", data.id).maybeSingle();
    const out = await callAI(
      "Você é o DeePersona, especialista em pesquisa de audiência da LeFil. Gere personas realistas de mercado brasileiro, em português do Brasil, com detalhes concretos e verossímeis. Sem clichês.",
      `Persona: ${persona?.name ?? "sem nome"}\nBriefing: ${data.briefing}\n\nGere: descrição curta (2-3 frases), cargo/rótulo, demografia, dores, ganhos e canais preferidos.`,
      BaseSchema,
    );
    const { data: row, error } = await context.supabase
      .from("personas")
      .update({
        description: out.description,
        role: out.role,
        demographics: out.demographics,
        pains: out.pains,
        gains: out.gains,
        channels: out.channels,
        stage: "base",
        status: "active",
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

const ICPSchema = z.object({
  segment: z.string(),
  company_size: z.string(),
  industries: z.array(z.string()).min(2).max(6),
  geography: z.string(),
  budget_range: z.string(),
  buying_triggers: z.array(z.string()).min(3).max(6),
  decision_criteria: z.array(z.string()).min(3).max(6),
  decision_makers: z.array(z.string()).min(1).max(5),
  disqualifiers: z.array(z.string()).min(2).max(5),
});

export const generateICP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: persona } = await context.supabase
      .from("personas").select("*").eq("id", data.id).maybeSingle();
    if (!persona) throw new Error("Persona não encontrada");
    const out = await callAI(
      "Você é o DeePersona. Defina o ICP (Ideal Customer Profile) a partir de uma persona existente. Seja específico, com números plausíveis e sinais concretos.",
      `Persona: ${persona.name} (${persona.role ?? "sem cargo"})\nDescrição: ${persona.description ?? "-"}\nDores: ${JSON.stringify(persona.pains)}\nGanhos: ${JSON.stringify(persona.gains)}\n\nRetorne o ICP correspondente.`,
      ICPSchema,
    );
    const { data: row, error } = await context.supabase
      .from("personas")
      .update({ icp: out, stage: "icp" })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

const JourneySchema = z.object({
  stages: z.array(z.object({
    key: z.enum(["descoberta", "consideracao", "decisao", "uso", "fidelizacao"]),
    label: z.string(),
    goal: z.string(),
    thinking: z.string(),
    feeling: z.string(),
    doing: z.array(z.string()).min(2).max(5),
    touchpoints: z.array(z.string()).min(2).max(5),
    questions: z.array(z.string()).min(2).max(4),
    content_ideas: z.array(z.string()).min(2).max(4),
    friction: z.string(),
  })).length(5),
});

export const generateJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: persona } = await context.supabase
      .from("personas").select("*").eq("id", data.id).maybeSingle();
    if (!persona) throw new Error("Persona não encontrada");
    const out = await callAI(
      "Você é o DeePersona. Desenhe a jornada da persona em 5 estágios: descoberta, consideracao, decisao, uso, fidelizacao. Realista, sem clichês.",
      `Persona: ${persona.name} (${persona.role ?? ""})\nDescrição: ${persona.description ?? "-"}\nDores: ${JSON.stringify(persona.pains)}\nGanhos: ${JSON.stringify(persona.gains)}\nCanais: ${JSON.stringify(persona.channels)}\nICP: ${JSON.stringify(persona.icp)}\n\nProduza a jornada em 5 estágios na ordem exata.`,
      JourneySchema,
    );
    const { data: row, error } = await context.supabase
      .from("personas")
      .update({ journey: out.stages, stage: "journey" })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

const InsightsSchema = z.object({
  insights: z.array(z.object({
    title: z.string(),
    body: z.string(),
    kind: z.enum(["oportunidade", "risco", "hipotese", "descoberta"]),
    confidence: z.enum(["baixa", "media", "alta"]),
    next_action: z.string(),
  })).min(4).max(6),
});

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: persona } = await context.supabase
      .from("personas").select("*").eq("id", data.id).maybeSingle();
    if (!persona) throw new Error("Persona não encontrada");
    const out = await callAI(
      "Você é o DeePersona. Gere insights acionáveis para marketing e produto a partir de uma persona completa. Cada insight deve indicar uma próxima ação concreta.",
      `Persona: ${persona.name} (${persona.role ?? ""})\nDescrição: ${persona.description ?? "-"}\nDores: ${JSON.stringify(persona.pains)}\nGanhos: ${JSON.stringify(persona.gains)}\nICP: ${JSON.stringify(persona.icp)}\nJornada: ${JSON.stringify(persona.journey)}`,
      InsightsSchema,
    );
    const { data: row, error } = await context.supabase
      .from("personas")
      .update({ insights: out.insights, stage: "live" })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });
