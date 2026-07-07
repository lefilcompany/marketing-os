import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Promove o usuário atual a superadmin SOMENTE se ainda não existir nenhum
 * superadmin no sistema (bootstrap do primeiro dono).
 * Também cria uma organização "LeFil" demo se não houver nenhuma, e adiciona
 * o usuário como org_admin, habilitando todas as aplicações.
 */
export const bootstrapFirstSuperadmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verifica se já existe superadmin (usa admin apenas para consulta segura)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("user_global_roles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1);

    if (existing && existing.length > 0) {
      return { promoted: false, reason: "already_exists" };
    }

    // Promove
    await supabaseAdmin.from("user_global_roles").insert({
      user_id: userId,
      role: "superadmin",
    });

    // Cria org LeFil se não existir nenhuma
    const { data: anyOrg } = await supabaseAdmin.from("organizations").select("id").limit(1);
    let orgId: string;
    if (!anyOrg || anyOrg.length === 0) {
      const { data: org } = await supabaseAdmin.from("organizations").insert({
        name: "LeFil",
        slug: "lefil",
        plan: "internal",
      }).select("id").single();
      orgId = org!.id;

      // adiciona o usuário como org_admin
      await supabaseAdmin.from("organization_members").insert({
        organization_id: orgId,
        user_id: userId,
        role: "org_admin",
        status: "active",
      });

      // habilita todas as apps
      const { data: apps } = await supabaseAdmin.from("applications").select("id");
      if (apps && apps.length) {
        await supabaseAdmin.from("organization_applications").insert(
          apps.map((a) => ({ organization_id: orgId, application_id: a.id, status: "enabled" as const })),
        );
      }
    } else {
      orgId = anyOrg[0].id;
    }

    void supabase;
    return { promoted: true, organizationId: orgId };
  });
