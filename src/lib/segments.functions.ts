import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PriorityEnum = z.enum(["low", "medium", "high"]);

export const listSegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audience_segments")
      .select("*")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

export const createSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    organizationId: string;
    name: string;
    hypothesis?: string;
    sizeEstimate?: string;
    priority?: z.infer<typeof PriorityEnum>;
    color?: string;
    characteristics?: string[];
    sourceRefs?: string[];
    personaId?: string;
  }) =>
    z
      .object({
        organizationId: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        hypothesis: z.string().max(1000).optional(),
        sizeEstimate: z.string().max(60).optional(),
        priority: PriorityEnum.optional(),
        color: z.string().max(30).optional(),
        characteristics: z.array(z.string()).optional(),
        sourceRefs: z.array(z.string().uuid()).optional(),
        personaId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("audience_segments")
      .insert({
        organization_id: data.organizationId,
        created_by: context.userId,
        name: data.name,
        hypothesis: data.hypothesis ?? null,
        size_estimate: data.sizeEstimate ?? null,
        priority: data.priority ?? "medium",
        color: data.color ?? null,
        characteristics: data.characteristics ?? [],
        source_refs: data.sourceRefs ?? [],
        persona_id: data.personaId ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row };
  });

export const deleteSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("audience_segments")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Gera clusters via IA a partir da matriz CSD + fontes coletadas. */
export const generateClusters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) =>
    z.object({ organizationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const [csdRes, srcRes] = await Promise.all([
      context.supabase
        .from("csd_items")
        .select("category,text")
        .eq("organization_id", data.organizationId),
      context.supabase
        .from("research_sources")
        .select("title,kind,summary,insights")
        .eq("organization_id", data.organizationId),
    ]);
    if (csdRes.error) throw new Error(csdRes.error.message);
    if (srcRes.error) throw new Error(srcRes.error.message);

    const csd = csdRes.data ?? [];
    const sources = srcRes.data ?? [];
    if (csd.length === 0 && sources.length === 0)
      throw new Error(
        "Preencha a Matriz CSD ou adicione fontes de pesquisa antes de gerar clusters.",
      );

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText, Output, NoObjectGeneratedError } = await import("ai");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-3-flash-preview");

    const Schema = z.object({
      segments: z.array(
        z.object({
          name: z.string(),
          hypothesis: z.string(),
          size_estimate: z.string(),
          priority: PriorityEnum,
          color: z.string(),
          characteristics: z.array(z.string()),
        }),
      ),
    });

    const csdBlock = csd
      .map((c) => `[${c.category}] ${c.text}`)
      .join("\n");
    const srcBlock = sources
      .map(
        (s) =>
          `- ${s.title} (${s.kind}): ${s.summary ?? ""} ${Array.isArray(s.insights) ? "· " + (s.insights as string[]).join(" · ") : ""}`,
      )
      .join("\n");

    const attempt = async (extra = "") => {
      const r = await generateText({
        model,
        system:
          "Você é especialista em segmentação de audiência. Gere de 3 a 5 clusters distintos e realistas em português do Brasil. Cada cluster deve ter cor em HEX (#RRGGBB), prioridade e 4-6 características.",
        prompt: `Matriz CSD:\n${csdBlock || "(vazia)"}\n\nFontes coletadas:\n${srcBlock || "(nenhuma)"}\n\nGere clusters acionáveis para virar personas.${extra}`,
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

    const rows = out.segments.map((s) => ({
      organization_id: data.organizationId,
      created_by: context.userId,
      name: s.name,
      hypothesis: s.hypothesis,
      size_estimate: s.size_estimate,
      priority: s.priority,
      color: s.color,
      characteristics: s.characteristics,
      source_refs: [],
    }));

    const { data: inserted, error } = await context.supabase
      .from("audience_segments")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);
    return { items: inserted ?? [], count: inserted?.length ?? 0 };
  });
