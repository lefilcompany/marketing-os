import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertSuperadmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_global_roles").select("role").eq("user_id", userId).eq("role", "superadmin").maybeSingle();
  if (!data) throw new Error("Somente superadministradores podem executar esta ação.");
}

export const adminListOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("organizations").select("*").order("created_at", { ascending: false });
    return { items: data ?? [] };
  });

export const adminCreateOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; slug: string; plan?: string }) =>
    z.object({
      name: z.string().min(2).max(120),
      slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
      plan: z.string().max(50).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase.from("organizations").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpdateOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; status?: "active" | "suspended" | "trial"; plan?: string; logo_url?: string }) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(2).max(120).optional(),
      status: z.enum(["active", "suspended", "trial"]).optional(),
      plan: z.string().max(50).optional(),
      logo_url: z.string().url().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("organizations").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetOrgApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string; applicationId: string; enabled: boolean }) =>
    z.object({
      organizationId: z.string().uuid(),
      applicationId: z.string().uuid(),
      enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    if (data.enabled) {
      const { error } = await context.supabase.from("organization_applications").upsert({
        organization_id: data.organizationId,
        application_id: data.applicationId,
        status: "enabled",
      }, { onConflict: "organization_id,application_id" });
      if (error) throw new Error(error.message);
    } else {
      await context.supabase.from("organization_applications")
        .delete().eq("organization_id", data.organizationId).eq("application_id", data.applicationId);
    }
    return { ok: true };
  });

export const adminListApps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("applications").select("*").order("sort_order");
    return { items: data ?? [] };
  });

const appSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  short_description: z.string().max(300).optional(),
  full_description: z.string().optional(),
  category: z.enum(["strategy", "content", "operations", "data_performance", "artificial_intelligence", "research_audience"]),
  external_url: z.string().url(),
  support_url: z.string().url().optional().or(z.literal("")),
  accent_color: z.string().max(20).optional(),
  icon: z.string().max(60).optional(),
  status: z.enum(["available", "unstable", "maintenance", "unavailable", "coming_soon"]),
  connection_mode: z.enum(["external_link", "authenticated_link", "sso"]),
  open_mode: z.enum(["new_tab", "same_tab"]),
  allowed_domains: z.array(z.string()).default([]),
  is_visible: z.boolean(),
  is_featured: z.boolean().optional(),
  is_new: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const adminUpsertApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => appSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await context.supabase.from("applications").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("applications").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminOrgDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const [{ data: org }, { data: apps }, { data: members }] = await Promise.all([
      context.supabase.from("organizations").select("*").eq("id", data.organizationId).maybeSingle(),
      context.supabase.from("organization_applications").select("application_id, status").eq("organization_id", data.organizationId),
      context.supabase.from("organization_members").select("id, role, status, user:profiles(email, full_name, avatar_url)").eq("organization_id", data.organizationId),
    ]);
    return { org, enabledApps: apps ?? [], members: members ?? [] };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const [orgs, users, logs, pending] = await Promise.all([
      context.supabase.from("organizations").select("id, status", { count: "exact" }),
      context.supabase.from("profiles").select("id", { count: "exact", head: true }),
      context.supabase.from("application_access_logs").select("id", { count: "exact", head: true }).eq("event_type", "app_open"),
      context.supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    const orgList = orgs.data ?? [];
    return {
      totalOrgs: orgList.length,
      activeOrgs: orgList.filter((o) => o.status === "active").length,
      suspendedOrgs: orgList.filter((o) => o.status === "suspended").length,
      totalUsers: users.count ?? 0,
      totalAppOpens: logs.count ?? 0,
      pendingRequests: pending.count ?? 0,
    };
  });

/** Cria comunicado. */
export const adminCreateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { title: string; content: string; type?: "info" | "success" | "warning" | "error" | "announcement"; priority?: "low" | "normal" | "high" | "critical"; action_url?: string; published?: boolean }) =>
    z.object({
      title: z.string().min(2).max(120),
      content: z.string().min(2),
      type: z.enum(["info", "success", "warning", "error", "announcement"]).default("announcement"),
      priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
      action_url: z.string().url().optional().or(z.literal("")),
      published: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperadmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("announcements").insert({
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority,
      action_url: data.action_url || null,
      published_at: data.published ? new Date().toISOString() : null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
