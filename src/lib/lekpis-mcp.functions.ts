// LeKPIs-specific server functions that wrap the generic MCP tool proxy.
// Each fn requires an active workspace membership.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };


const PROVIDER = "lekpis" as const;

const TRUSTED_BROKER_HOSTS = new Set<string>([
  "phsqbgdjsohmjjoeeqqc.supabase.co",
  "pla.lekpis.lefil.com.br",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertWs(supabase: any, userId: string, workspaceId: string | null) {
  if (!workspaceId) return;
  const { data, error } = await supabase.rpc("is_org_member", {
    _user_id: userId,
    _org_id: workspaceId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Você não é membro deste workspace.");
}

async function callTool(
  userId: string,
  workspaceId: string | null,
  name: string,
  args: Record<string, unknown>,
) {
  const { mcpCallTool } = await import("./mcp.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { decryptToken, encryptToken, TOKEN_ENCRYPTION_VERSION } = await import(
    "./mcp-crypto.server"
  );
  const { getProvider, refreshTokens } = await import("./mcp.server");

  const q = supabaseAdmin
    .from("mcp_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", PROVIDER);
  const { data: row, error } = await (workspaceId
    ? q.eq("workspace_id", workspaceId).maybeSingle()
    : q.is("workspace_id", null).maybeSingle());
  if (error) throw new Error(error.message);
  if (!row) throw new Error("LeKPIs não está conectado neste workspace.");

  let accessToken = row.access_token_ciphertext
    ? await decryptToken(row.access_token_ciphertext)
    : row.access_token;
  const refreshToken = row.refresh_token_ciphertext
    ? await decryptToken(row.refresh_token_ciphertext)
    : row.refresh_token ?? null;

  const now = Date.now();
  const expMs = row.expires_at ? new Date(row.expires_at).getTime() : Infinity;
  if (expMs - now <= 30_000 && refreshToken) {
    const provider = getProvider(PROVIDER);
    const tokens = await refreshTokens(provider, row.client_id, refreshToken);
    accessToken = tokens.access_token;
    const accessCipher = await encryptToken(tokens.access_token);
    const refreshCipher = tokens.refresh_token
      ? await encryptToken(tokens.refresh_token)
      : row.refresh_token_ciphertext ?? null;
    await supabaseAdmin
      .from("mcp_connections")
      .update({
        access_token: "",
        refresh_token: null,
        access_token_ciphertext: accessCipher,
        refresh_token_ciphertext: refreshCipher,
        token_encryption_version: TOKEN_ENCRYPTION_VERSION,
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scope: tokens.scope ?? row.scope,
      })
      .eq("id", row.id);
  }

  return mcpCallTool(row.resource, accessToken, name, args);
}

/** Validate a broker URL returned by connect_provider before opening it. */
export function isTrustedBrokerUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    return TRUSTED_BROKER_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export const lekpisConnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workspaceId?: string | null;
      provider: string;
      returnUrl?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const args: Record<string, unknown> = { provider: data.provider };
    if (data.returnUrl) args.return_url = data.returnUrl;
    const result = (await callTool(
      context.userId,
      data.workspaceId ?? null,
      "connect_provider",
      args,
    )) as unknown;
    return JSON.parse(JSON.stringify({ result })) as { result: JsonValue };

  });

export const lekpisListAvailableAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { workspaceId?: string | null; provider: string }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const result = await callTool(
      context.userId,
      data.workspaceId ?? null,
      "list_available_accounts",
      { provider: data.provider },
    );
    return JSON.parse(JSON.stringify({ result })) as {
      result: JsonValue };
  });

export const lekpisSelectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workspaceId?: string | null;
      provider: string;
      externalAccountId: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const result = await callTool(
      context.userId,
      data.workspaceId ?? null,
      "select_account",
      { provider: data.provider, external_account_id: data.externalAccountId },
    );
    return JSON.parse(JSON.stringify({ result })) as { result: JsonValue };
  });

export const lekpisSyncMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workspaceId?: string | null;
      startDate: string;
      endDate: string;
      provider?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const args: Record<string, unknown> = {
      start_date: data.startDate,
      end_date: data.endDate,
    };
    if (data.provider) args.provider = data.provider;
    const result = await callTool(
      context.userId,
      data.workspaceId ?? null,
      "sync_metrics",
      args,
    );
    return JSON.parse(JSON.stringify({ result })) as { result: JsonValue };
  });

export const lekpisGetDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workspaceId?: string | null;
      startDate: string;
      endDate: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const result = await callTool(
      context.userId,
      data.workspaceId ?? null,
      "get_dashboard",
      { start_date: data.startDate, end_date: data.endDate },
    );
    return JSON.parse(JSON.stringify({ result })) as { result: JsonValue };
  });

export const lekpisGetMetricSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      workspaceId?: string | null;
      metric: string;
      startDate: string;
      endDate: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const result = await callTool(
      context.userId,
      data.workspaceId ?? null,
      "get_metric_series",
      {
        metric: data.metric,
        start_date: data.startDate,
        end_date: data.endDate,
      },
    );
    return JSON.parse(JSON.stringify({ result })) as { result: JsonValue };
  });

export const lekpisUpdateMetricTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { workspaceId?: string | null; metric: string; target: number }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWs(context.supabase, context.userId, data.workspaceId ?? null);
    const result = await callTool(
      context.userId,
      data.workspaceId ?? null,
      "update_metric_target",
      { metric: data.metric, target: data.target },
    );
    return JSON.parse(JSON.stringify({ result })) as {
      result: JsonValue };
  });
