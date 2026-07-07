import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Valida acesso, registra log e devolve a URL externa segura.
 * Só devolve URLs cujo host está em `allowed_domains`.
 */
export const resolveAppRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; applicationId: string }) =>
    z.object({ organizationId: z.string().uuid(), applicationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Membership + role
    const { data: member } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!member) throw new Error("Você não pertence a esta empresa.");

    // 2. Org tem a app habilitada
    const { data: orgApp } = await supabase
      .from("organization_applications")
      .select("id, status, application:applications(id, name, external_url, allowed_domains, open_mode, status)")
      .eq("organization_id", data.organizationId)
      .eq("application_id", data.applicationId)
      .maybeSingle();
    if (!orgApp || orgApp.status !== "enabled" || !orgApp.application) {
      await supabase.from("application_access_logs").insert({
        organization_id: data.organizationId, user_id: userId, application_id: data.applicationId,
        event_type: "app_open_denied", metadata: { reason: "app_not_enabled" },
      });
      throw new Error("Esta aplicação não está disponível para a sua empresa.");
    }

    const app = orgApp.application;
    if (app.status !== "available" && app.status !== "unstable") {
      throw new Error("Aplicação em manutenção ou indisponível no momento.");
    }

    // 3. Permissão individual (org_admin sempre pode)
    if (member.role !== "org_admin") {
      const { data: perm } = await supabase
        .from("user_application_permissions")
        .select("can_access")
        .eq("organization_member_id", member.id)
        .eq("application_id", data.applicationId)
        .maybeSingle();
      if (perm && perm.can_access === false) {
        await supabase.from("application_access_logs").insert({
          organization_id: data.organizationId, user_id: userId, application_id: data.applicationId,
          event_type: "app_open_denied", metadata: { reason: "no_permission" },
        });
        throw new Error("Você não tem permissão para acessar esta aplicação.");
      }
    }

    // 4. Validar URL contra allowed_domains
    let url: URL;
    try { url = new URL(app.external_url); }
    catch { throw new Error("URL da aplicação inválida."); }
    const allowed = (app.allowed_domains ?? []).map((d) => d.toLowerCase());
    if (allowed.length && !allowed.includes(url.host.toLowerCase())) {
      throw new Error("URL fora da lista de domínios autorizados.");
    }

    // 5. Registrar log
    await supabase.from("application_access_logs").insert({
      organization_id: data.organizationId, user_id: userId, application_id: data.applicationId,
      event_type: "app_open", metadata: { url: app.external_url },
    });

    return { url: app.external_url, openMode: app.open_mode, name: app.name };
  });

/** Cria uma solicitação de acesso. */
export const requestAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; applicationId: string; reason?: string }) =>
    z.object({
      organizationId: z.string().uuid(),
      applicationId: z.string().uuid(),
      reason: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("access_requests").insert({
      user_id: userId, organization_id: data.organizationId,
      application_id: data.applicationId, reason: data.reason,
    });
    if (error) throw new Error(error.message);
    await supabase.from("application_access_logs").insert({
      user_id: userId, organization_id: data.organizationId,
      application_id: data.applicationId, event_type: "access_requested",
    });
    return { ok: true };
  });
