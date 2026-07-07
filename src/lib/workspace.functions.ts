import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Retorna dados do usuário atual: perfil, organizações, superadmin flag. */
export const getSessionBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: memberships }, { data: superRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("id, role, status, organization:organizations(id, name, slug, logo_url, status, plan)")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase.from("user_global_roles").select("role").eq("user_id", userId),
    ]);

    return {
      userId,
      profile,
      memberships: memberships ?? [],
      isSuperadmin: (superRows ?? []).some((r) => r.role === "superadmin"),
    };
  });

/** Aplicações do workspace atual (apenas as habilitadas). */
export const getWorkspaceApps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: member } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!member) return { apps: [], memberId: null as string | null, role: null as string | null };

    const [{ data: orgApps }, { data: perms }, { data: favs }] = await Promise.all([
      supabase
        .from("organization_applications")
        .select("id, status, expires_at, application:applications(*)")
        .eq("organization_id", data.organizationId)
        .eq("status", "enabled"),
      supabase
        .from("user_application_permissions")
        .select("application_id, can_access")
        .eq("organization_member_id", member.id),
      supabase.from("favorites").select("application_id").eq("user_id", userId).eq("organization_id", data.organizationId),
    ]);

    const permMap = new Map((perms ?? []).map((p) => [p.application_id, p.can_access]));
    const favSet = new Set((favs ?? []).map((f) => f.application_id));

    const apps = (orgApps ?? []).map((oa) => ({
      ...oa.application,
      orgAppStatus: oa.status,
      canAccess: member.role === "org_admin" || (permMap.get(oa.application!.id) ?? true),
      isFavorite: favSet.has(oa.application!.id),
    }));

    return { apps, memberId: member.id, role: member.role };
  });

/** Catálogo completo de aplicações (visíveis) para exibir no browse. */
export const getFullCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: apps }, { data: enabled }] = await Promise.all([
      supabase.from("applications").select("*").eq("is_visible", true).order("sort_order"),
      supabase.from("organization_applications").select("application_id, status").eq("organization_id", data.organizationId),
    ]);
    const enabledMap = new Map((enabled ?? []).map((e) => [e.application_id, e.status]));
    return {
      apps: (apps ?? []).map((a) => ({
        ...a,
        orgAppStatus: enabledMap.get(a.id) ?? null,
        included: enabledMap.get(a.id) === "enabled",
      })),
    };
  });

/** Últimos acessos do usuário no workspace. */
export const getRecentAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: logs } = await context.supabase
      .from("application_access_logs")
      .select("id, application_id, created_at, application:applications(id, name, slug, icon, accent_color, status)")
      .eq("user_id", userId)
      .eq("organization_id", data.organizationId)
      .eq("event_type", "app_open")
      .order("created_at", { ascending: false })
      .limit(4);
    void supabase; void userId;
    // dedupe por application
    const seen = new Set<string>();
    const items = (logs ?? []).filter((l) => {
      if (!l.application_id || seen.has(l.application_id)) return false;
      seen.add(l.application_id);
      return true;
    });
    return { items };
  });

/** Alterna favorito */
export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; applicationId: string }) =>
    z.object({ organizationId: z.string().uuid(), applicationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", data.organizationId)
      .eq("application_id", data.applicationId)
      .maybeSingle();
    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    await supabase.from("favorites").insert({
      user_id: userId,
      organization_id: data.organizationId,
      application_id: data.applicationId,
    });
    return { favorited: true };
  });

/** Atualiza perfil do usuário. */
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { full_name?: string; job_title?: string; phone?: string; avatar_url?: string; onboarding_completed?: boolean }) =>
    z.object({
      full_name: z.string().max(120).optional(),
      job_title: z.string().max(120).optional(),
      phone: z.string().max(30).optional(),
      avatar_url: z.string().url().optional(),
      onboarding_completed: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
