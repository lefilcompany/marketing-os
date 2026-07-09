import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * DeePersona — Etapa 06 · Agentes IA
 * Cria agentes conversacionais moldados por uma persona
 * ============================================================ */

export const listAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("persona_agents")
      .select("*, personas(id, name, role)")
      .eq("organization_id", data.organizationId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("persona_agents")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AgentSpecSchema = z.object({
  name: z.string(),
  role: z.string(),
  tone: z.string(),
  system_prompt: z.string(),
  capabilities: z.array(z.string()),
  starter_questions: z.array(z.string()),
});

/** Gera especificação de um agente IA a partir de uma persona e a salva. */
export const generateAgentFromPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { personaId: string; purpose?: string }) =>
    z.object({
      personaId: z.string().uuid(),
      purpose: z.string().trim().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: persona } = await context.supabase
      .from("personas")
      .select("*")
      .eq("id", data.personaId)
      .maybeSingle();
    if (!persona) throw new Error("Persona não encontrada");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "Você é o DeePersona. Projete agentes IA fiéis a personas reais: linguagem, tom, prioridades, objeções e vocabulário devem soar como a pessoa descrita — nunca genérico. system_prompt deve instruir o LLM a incorporar a persona em 1ª pessoa.",
      prompt: `Persona:\n${JSON.stringify({
        name: persona.name,
        role: persona.role,
        description: persona.description,
        demographics: persona.demographics,
        pains: persona.pains,
        gains: persona.gains,
        channels: persona.channels,
        icp: persona.icp,
      }, null, 2)}\n\nPropósito do agente: ${data.purpose || "Simular a persona em conversas de descoberta, entrevista e teste de mensagens."}\n\nGere: name (curto, humano), role (o que o agente faz), tone (2-3 adjetivos), system_prompt (parágrafo completo em 1ª pessoa, PT-BR), capabilities (3-6), starter_questions (4-6 perguntas que o usuário pode iniciar com o agente).`,
      output: Output.object({ schema: AgentSpecSchema }),
    });
    const spec = result.output as z.infer<typeof AgentSpecSchema>;

    const { data: row, error } = await context.supabase
      .from("persona_agents")
      .insert({
        organization_id: persona.organization_id,
        persona_id: persona.id,
        name: spec.name,
        role: spec.role,
        tone: spec.tone,
        system_prompt: spec.system_prompt,
        capabilities: spec.capabilities,
        starter_questions: spec.starter_questions,
        status: "active",
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

/** Envia uma mensagem ao agente e recebe resposta contextualizada. */
export const chatWithAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    agentId: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }) =>
    z.object({
      agentId: z.string().uuid(),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })).min(1).max(40),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: agent } = await context.supabase
      .from("persona_agents")
      .select("*, personas(name, role, description, demographics, pains, gains, channels)")
      .eq("id", data.agentId)
      .maybeSingle();
    if (!agent) throw new Error("Agente não encontrado");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const personaCtx = agent.personas
      ? `\n\nContexto de fundo (não citar diretamente):\n${JSON.stringify(agent.personas, null, 2)}`
      : "";

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `${agent.system_prompt}${personaCtx}\n\nResponda sempre em 1ª pessoa, em português do Brasil, curto e natural (2-5 frases). Nunca revele que é uma IA — você É a persona.`,
      messages: data.messages,
    });

    return { reply: result.text };
  });
