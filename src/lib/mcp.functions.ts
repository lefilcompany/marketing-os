// Client-callable server functions for MCP OAuth + tool proxy.
// Do NOT put server-only imports at module scope — load them lazily inside handlers.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function originFromRequest(): string {
  const req = getRequest();
  const url = new URL(req!.url);
  const forwardedHost = req!.headers.get("x-forwarded-host");
  const forwardedProto = req!.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? url.host;
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Starts OAuth: DCR + PKCE + persist state, returns authorize URL for the browser to open. */
export const startMcpAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; returnTo?: string }) => input)
  .handler(async ({ data, context }) => {
    const { getProvider, pkcePair, randomToken, registerClient } = await import(
      "./mcp.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const provider = getProvider(data.provider);
    const redirectUri = `${originFromRequest()}/api/mcp/callback`;

    const clientId = await registerClient(provider, redirectUri);
    const { verifier, challenge } = await pkcePair();
    const state = randomToken(24);

    const { error } = await supabaseAdmin.from("mcp_oauth_states").insert({
      state,
      user_id: context.userId,
      provider: provider.slug,
      client_id: clientId,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      return_to: data.returnTo ?? null,
    });
    if (error) throw new Error(`Falha ao gravar state: ${error.message}`);

    const authorizeUrl = new URL(provider.authorizationEndpoint);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", provider.scope);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("resource", provider.resource);

    return { authorizeUrl: authorizeUrl.toString() };
  });

export const getMcpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("mcp_connections")
      .select("provider, authorization_server, resource, expires_at, scope, created_at, updated_at")
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { connection: row };
  });

async function loadAccessToken(userId: string, providerSlug: string): Promise<{
  accessToken: string;
  resource: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getProvider, refreshTokens } = await import("./mcp.server");

  const { data: row, error } = await supabaseAdmin
    .from("mcp_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", providerSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("MCP não conectado — clique em Conectar.");

  const now = Date.now();
  const expMs = row.expires_at ? new Date(row.expires_at).getTime() : Infinity;
  const provider = getProvider(providerSlug);

  if (expMs - now > 30_000 || !row.refresh_token) {
    return { accessToken: row.access_token, resource: row.resource };
  }

  // Refresh
  const tokens = await refreshTokens(provider, row.client_id, row.refresh_token);
  const newExpires = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  const { error: upErr } = await supabaseAdmin
    .from("mcp_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? row.refresh_token,
      expires_at: newExpires,
      scope: tokens.scope ?? row.scope,
    })
    .eq("id", row.id);
  if (upErr) throw new Error(upErr.message);
  return { accessToken: tokens.access_token, resource: row.resource };
}

export const listMcpTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => input)
  .handler(async ({ data, context }) => {
    const { mcpInitializeAndListTools } = await import("./mcp.server");
    const { accessToken, resource } = await loadAccessToken(context.userId, data.provider);
    const { tools, serverInfo } = await mcpInitializeAndListTools(resource, accessToken);
    return { tools, serverInfo };
  });

export const callMcpTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { provider: string; name: string; arguments: Record<string, unknown> }) => input,
  )
  .handler(async ({ data, context }) => {
    const { mcpCallTool } = await import("./mcp.server");
    const { accessToken, resource } = await loadAccessToken(context.userId, data.provider);
    const result = await mcpCallTool(resource, accessToken, data.name, data.arguments);
    return { result };
  });

export const disconnectMcp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("mcp_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
