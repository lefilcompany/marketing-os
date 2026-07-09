import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * DeePersona — Etapa 05 · Priorização
 * Matriz importância × urgência (1..5)
 * ============================================================ */

export const setPersonaPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    importance?: number | null;
    urgency?: number | null;
    priorityNotes?: string | null;
  }) =>
    z.object({
      id: z.string().uuid(),
      importance: z.number().int().min(1).max(5).nullable().optional(),
      urgency: z.number().int().min(1).max(5).nullable().optional(),
      priorityNotes: z.string().max(2000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.importance !== undefined) patch.importance = data.importance;
    if (data.urgency !== undefined) patch.urgency = data.urgency;
    if (data.priorityNotes !== undefined) patch.priority_notes = data.priorityNotes;
    const { data: row, error } = await context.supabase
      .from("personas")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

const SuggestSchema = z.object({
  suggestions: z.array(z.object({
    persona_id: z.string(),
    importance: z.number().int().min(1).max(5),
    urgency: z.number().int().min(1).max(5),
    rationale: z.string(),
  })),
});

export const suggestPriorities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: personas } = await context.supabase
      .from("personas")
      .select("id, name, role, description, pains, gains")
      .eq("organization_id", data.organizationId);
    if (!personas || personas.length === 0) {
      throw new Error("Nenhuma persona para priorizar");
    }
    const { data: csd } = await context.supabase
      .from("csd_items")
      .select("kind, content")
      .eq("organization_id", data.organizationId);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system:
        "Você é o DeePersona. Priorize personas em uma matriz importância × urgência (escala 1 a 5). Base sua análise no valor estratégico (importância) e no timing/oportunidade de mercado (urgência).",
      prompt: `Personas:\n${JSON.stringify(personas, null, 2)}\n\nMatriz CSD:\n${JSON.stringify(csd ?? [], null, 2)}\n\nSugira importance (1-5) e urgency (1-5) para CADA persona, com breve rationale (1 frase). Use exatamente os persona_id fornecidos.`,
      output: Output.object({ schema: SuggestSchema }),
    });
    const out = result.output as z.infer<typeof SuggestSchema>;

    // Aplica no banco
    for (const s of out.suggestions) {
      await context.supabase
        .from("personas")
        .update({ importance: s.importance, urgency: s.urgency })
        .eq("id", s.persona_id)
        .eq("organization_id", data.organizationId);
    }
    return { suggestions: out.suggestions };
  });
