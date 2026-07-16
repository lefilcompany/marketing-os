// Server functions for the Campaign Analysis feature (LeKPIs MCP).
// Errors are returned as typed payloads so the UI can render clear states.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toMcpErrorPayload } from "./mcp-client/errors";

type ErrResult = { ok: false; error: { code: string; message: string } };
type OkResult<T> = { ok: true; data: T };
type Result<T> = OkResult<T> | ErrResult;

function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  return fn().then(
    (data) => ({ ok: true as const, data }),
    (err) => ({ ok: false as const, error: toMcpErrorPayload(err) }),
  );
}

export const lekpisConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("mcp_connections")
      .select("id, updated_at")
      .eq("user_id", context.userId)
      .eq("provider", "lekpis")
      .limit(1);
    return { connected: !!data?.[0] };
  });

export const lekpisListClients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listClients } = await import("./mcp-client/providers/lekpis.server");
    return safe(() => listClients(context.userId));
  });

export const lekpisListCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { clientId: string }) => input)
  .handler(async ({ data, context }) => {
    const { listCampaigns } = await import("./mcp-client/providers/lekpis.server");
    return safe(() => listCampaigns(context.userId, data.clientId));
  });

export const runCampaignAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      clientId: string;
      campaignIds: string[];
      startDate: string;
      endDate: string;
      timezone: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { runCampaignAnalysis: run } = await import(
      "./mcp-client/providers/lekpis.server"
    );
    return safe(() => run(context.userId, data));
  });
