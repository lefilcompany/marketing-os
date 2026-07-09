import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * DeePersona — Matriz CSD (Certezas · Suposições · Dúvidas)
 * ============================================================ */

const CategoryEnum = z.enum(["certainty", "assumption", "doubt"]);

/** Lista itens CSD do workspace. */
export const listCsdItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("csd_items")
      .select("*")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

/** Cria um item CSD. */
export const createCsdItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    organizationId: string;
    category: "certainty" | "assumption" | "doubt";
    text: string;
    source?: "manual" | "ai";
  }) =>
    z.object({
      organizationId: z.string().uuid(),
      category: CategoryEnum,
      text: z.string().trim().min(1).max(500),
      source: z.enum(["manual", "ai"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("csd_items")
      .insert({
        organization_id: data.organizationId,
        created_by: context.userId,
        category: data.category,
        text: data.text,
        source: data.source ?? "manual",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

/** Remove um item CSD. */
export const deleteCsdItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("csd_items")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera sugestões CSD via IA a partir de um contexto de negócio e persiste. */
export const generateCsdSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; businessContext: string }) =>
    z.object({
      organizationId: z.string().uuid(),
      businessContext: z.string().trim().min(10).max(4000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output, NoObjectGeneratedError } = await import("ai");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const Schema = z.object({
      certainties: z.array(z.string()),
      assumptions: z.array(z.string()),
      doubts: z.array(z.string()),
    });

    const attempt = async (extra = "") => {
      const result = await generateText({
        model,
        system:
          "Você é o DeePersona, especialista em pesquisa de audiência. Gere itens realistas para a Matriz CSD (Certezas, Suposições, Dúvidas) sobre o público-alvo, em português do Brasil, com detalhes concretos e verossímeis.",
        prompt: `Contexto do negócio:\n${data.businessContext}\n\nRetorne 4 a 6 itens em cada categoria. Certezas = o que já sabemos com segurança. Suposições = o que acreditamos, mas precisa validar. Dúvidas = perguntas abertas.${extra ? "\n\n" + extra : ""}`,
        output: Output.object({ schema: Schema }),
      });
      return result.output as z.infer<typeof Schema>;
    };

    let out: z.infer<typeof Schema>;
    try {
      out = await attempt();
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        out = await attempt(
          "IMPORTANTE: Retorne APENAS um JSON válido no schema pedido.",
        );
      } else throw err;
    }

    const rows = [
      ...out.certainties.map((text) => ({ text, category: "certainty" as const })),
      ...out.assumptions.map((text) => ({ text, category: "assumption" as const })),
      ...out.doubts.map((text) => ({ text, category: "doubt" as const })),
    ]
      .filter((r) => r.text.trim().length > 0)
      .map((r) => ({
        organization_id: data.organizationId,
        created_by: context.userId,
        category: r.category,
        text: r.text.trim(),
        source: "ai" as const,
      }));

    if (rows.length === 0) return { items: [], count: 0 };

    const { data: inserted, error } = await context.supabase
      .from("csd_items")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);
    return { items: inserted ?? [], count: inserted?.length ?? 0 };
  });
