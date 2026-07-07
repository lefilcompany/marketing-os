import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; all?: boolean }) =>
    z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", context.userId).is("read_at", null);
    if (data.id) await q.eq("id", data.id); else await q;
    return { ok: true };
  });

export const listActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId?: string; scope: "me" | "org" | "global" }) =>
    z.object({ organizationId: z.string().uuid().optional(), scope: z.enum(["me", "org", "global"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("application_access_logs")
      .select("id, event_type, created_at, metadata, user_id, organization_id, application_id, application:applications(name, slug, accent_color)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.scope === "me") q = q.eq("user_id", context.userId);
    if (data.scope === "org" && data.organizationId) q = q.eq("organization_id", data.organizationId);
    const { data: rows } = await q;
    return { items: rows ?? [] };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("announcements")
      .select("*")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(10);
    return { items: data ?? [] };
  });
