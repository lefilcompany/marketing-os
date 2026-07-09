import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const KindEnum = z.enum([
  "interview",
  "survey",
  "analytics",
  "social",
  "crm",
  "desk",
  "other",
]);
const StatusEnum = z.enum(["planned", "collecting", "analyzed", "archived"]);

export const listResearchSources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("research_sources")
      .select("*")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createResearchSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    organizationId: string;
    title: string;
    kind?: z.infer<typeof KindEnum>;
    status?: z.infer<typeof StatusEnum>;
    summary?: string;
    url?: string;
    notes?: string;
    csdItemId?: string;
  }) =>
    z
      .object({
        organizationId: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        kind: KindEnum.optional(),
        status: StatusEnum.optional(),
        summary: z.string().max(2000).optional(),
        url: z.string().url().optional().or(z.literal("")),
        notes: z.string().max(5000).optional(),
        csdItemId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("research_sources")
      .insert({
        organization_id: data.organizationId,
        created_by: context.userId,
        title: data.title,
        kind: data.kind ?? "interview",
        status: data.status ?? "planned",
        summary: data.summary ?? null,
        url: data.url || null,
        notes: data.notes ?? null,
        csd_item_id: data.csdItemId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

export const updateResearchSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    patch: Partial<{
      title: string;
      kind: z.infer<typeof KindEnum>;
      status: z.infer<typeof StatusEnum>;
      summary: string | null;
      url: string | null;
      notes: string | null;
      csd_item_id: string | null;
    }>;
  }) =>
    z
      .object({
        id: z.string().uuid(),
        patch: z.record(z.string(), z.any()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("research_sources")
      .update(data.patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

export const deleteResearchSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("research_sources")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera insights via IA a partir de notas coletadas. */
export const extractInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: src, error: e1 } = await context.supabase
      .from("research_sources")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    if (!src.notes && !src.summary)
      throw new Error("Adicione notas ou resumo antes de extrair insights.");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const Schema = z.object({
      insights: z.array(z.string()),
      summary: z.string(),
    });

    const attempt = async (extra = "") => {
      const r = await generateText({
        model,
        system:
          "Você é analista de pesquisa. Extraia insights acionáveis das notas em português do Brasil. Cada insight deve ser específico e útil para criação de personas.",
        prompt: `Fonte: ${src.title}\nTipo: ${src.kind}\nNotas:\n${src.notes ?? src.summary}\n\nRetorne 4 a 8 insights curtos e um resumo executivo.${extra}`,
        output: Output.object({ schema: Schema }),
      });
      return r.output as z.infer<typeof Schema>;
    };

    let out: z.infer<typeof Schema>;
    try {
      out = await attempt();
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        out = await attempt("\n\nRetorne APENAS JSON válido.");
      } else throw err;
    }

    const { data: updated, error: e2 } = await context.supabase
      .from("research_sources")
      .update({
        insights: out.insights,
        summary: out.summary,
        status: "analyzed",
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (e2) throw new Error(e2.message);
    return { item: updated };
  });
