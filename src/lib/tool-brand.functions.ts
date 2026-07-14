// Server functions para gerenciar a "marca" que cada ferramenta do dashboard usa.
// Cada usuário guarda uma marca (texto livre) por tool_id.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listToolBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("tool_brand_settings")
      .select("tool_id, brand")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.tool_id] = row.brand ?? "";
    return { brands: map };
  });

export const setToolBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { toolId: string; brand: string }) => {
    if (!input.toolId) throw new Error("toolId obrigatório");
    return { toolId: input.toolId.slice(0, 64), brand: (input.brand ?? "").slice(0, 200) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tool_brand_settings")
      .upsert(
        {
          user_id: context.userId,
          tool_id: data.toolId,
          brand: data.brand,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,tool_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
