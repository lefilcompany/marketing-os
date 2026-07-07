import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: members } = await context.supabase
      .from("organization_members")
      .select("id, role, status, joined_at, user_id, profile:profiles(id, email, full_name, avatar_url, job_title)")
      .eq("organization_id", data.organizationId)
      .order("joined_at", { ascending: false });
    return { members: members ?? [] };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; role: "org_admin" | "member" | "viewer" }) =>
    z.object({ memberId: z.string().uuid(), role: z.enum(["org_admin", "member", "viewer"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("organization_members").update({ role: data.role }).eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string; status: "active" | "disabled" }) =>
    z.object({ memberId: z.string().uuid(), status: z.enum(["active", "disabled"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("organization_members").update({ status: data.status }).eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { memberId: string }) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("organization_members").delete().eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAccessRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { organizationId: string }) => z.object({ organizationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("access_requests")
      .select("*, application:applications(name, slug, accent_color), profile:profiles!access_requests_user_id_fkey(full_name, email, avatar_url)")
      .eq("organization_id", data.organizationId)
      .order("created_at", { ascending: false });
    return { items: rows ?? [] };
  });

export const decideAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { requestId: string; decision: "approved" | "rejected"; note?: string }) =>
    z.object({
      requestId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: req } = await supabase.from("access_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Solicitação não encontrada.");

    await supabase.from("access_requests").update({
      status: data.decision, review_note: data.note, reviewed_by: userId, reviewed_at: new Date().toISOString(),
    }).eq("id", data.requestId);

    if (data.decision === "approved") {
      // grant permission
      const { data: member } = await supabase.from("organization_members")
        .select("id").eq("organization_id", req.organization_id).eq("user_id", req.user_id).maybeSingle();
      if (member) {
        await supabase.from("user_application_permissions").upsert({
          organization_member_id: member.id,
          application_id: req.application_id,
          can_access: true,
          granted_by: userId,
        }, { onConflict: "organization_member_id,application_id" });
      }
    }

    await supabase.from("notifications").insert({
      user_id: req.user_id,
      organization_id: req.organization_id,
      title: data.decision === "approved" ? "Acesso aprovado" : "Acesso recusado",
      message: data.note ?? null,
      type: data.decision === "approved" ? "success" : "warning",
    });

    return { ok: true };
  });
