// Client-callable server functions for MCP OAuth + tool proxy.
// Server-only imports are loaded lazily inside handlers.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Internal paths that may be used as returnTo after OAuth. */
const RETURN_TO_ALLOWLIST = /^\/(lekpis|deepersona|soma|creator|estrategia|comunidades|biblioteca|ia)(\/|\?|$)/;

function originFromRequest(): string {
  const req = getRequest();
  const url = new URL(req!.url);
  const forwardedHost = req!.headers.get("x-forwarded-host");
  const forwardedProto = req!.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? url.host;
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function sanitizeReturnTo(input: string | undefined, fallback: string): string {
  if (!input || typeof input !== "string") return fallback;
  // Only same-origin relative paths, and only known internal modules.
  if (!input.startsWith("/") || input.startsWith("//")) return fallback;
  return RETURN_TO_ALLOWLIST.test(input) ? input : fallback;
}

async function assertWorkspaceMembership(
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => {
      then: <T>(cb: (v: { data: T | null; error: { message: string } | null }) => void) => void;
    };
  },
  userId: string,
  workspaceId: string | null,
): Promise<void> {
  if (!workspaceId) return;
  const { data, error } = (await (supabase as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  }).rpc("is_org_member", { _user_id: userId, _org_id: workspaceId }));
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Você não é membro deste workspace.");
}

/** Starts OAuth: DCR + PKCE + persist state, returns authorize URL. */
export const startMcpAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { provider: string; workspaceId?: string | null; returnTo?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { getProvider, pkcePair, randomToken, registerClient } = await import("./mcp.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const provider = getProvider(data.provider);
    const redirectUri = `${originFromRequest()}/api/mcp/callback`;

    await assertWorkspaceMembership(context.supabase, context.userId, data.workspaceId ?? null);

    const clientId = await registerClient(provider, redirectUri);
    const { verifier, challenge } = await pkcePair();
    const state = randomToken(24);
    const returnTo = sanitizeReturnTo(data.returnTo, `/${provider.slug}`);

    const { error } = await supabaseAdmin.from("mcp_oauth_states").insert({
      state,
      user_id: context.userId,
      workspace_id: data.workspaceId ?? null,
      provider: provider.slug,
      client_id: clientId,
      code_verifier: verifier,
      redirect_uri: redirectUri,
      return_to: returnTo,
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
  .inputValidator((input: { provider: string; workspaceId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    await assertWorkspaceMembership(context.supabase, context.userId, data.workspaceId ?? null);
    const q = context.supabase
      .from("mcp_connections")
      .select("provider, authorization_server, resource, expires_at, scope, created_at, updated_at, workspace_id")
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    const { data: row, error } = await (data.workspaceId
      ? q.eq("workspace_id", data.workspaceId).maybeSingle()
      : q.is("workspace_id", null).maybeSingle());
    if (error) throw new Error(error.message);
    return { connection: row };
  });

async function loadAccessToken(
  userId: string,
  providerSlug: string,
  workspaceId: string | null,
): Promise<{ accessToken: string; resource: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getProvider, refreshTokens } = await import("./mcp.server");
  const { encryptToken, decryptToken, TOKEN_ENCRYPTION_VERSION } = await import(
    "./mcp-crypto.server"
  );

  const q = supabaseAdmin
    .from("mcp_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", providerSlug);
  const { data: row, error } = await (workspaceId
    ? q.eq("workspace_id", workspaceId).maybeSingle()
    : q.is("workspace_id", null).maybeSingle());
  if (error) throw new Error(error.message);
  if (!row) throw new Error("MCP não conectado — clique em Conectar.");

  // Prefer ciphertext; fallback to legacy plaintext for backward compat (DeePersona).
  let accessToken: string;
  if (row.access_token_ciphertext) {
    accessToken = await decryptToken(row.access_token_ciphertext);
  } else {
    accessToken = row.access_token;
  }
  let refreshToken: string | null = null;
  if (row.refresh_token_ciphertext) {
    refreshToken = await decryptToken(row.refresh_token_ciphertext);
  } else if (row.refresh_token) {
    refreshToken = row.refresh_token;
  }

  const now = Date.now();
  const expMs = row.expires_at ? new Date(row.expires_at).getTime() : Infinity;
  const provider = getProvider(providerSlug);

  if (expMs - now > 30_000 || !refreshToken) {
    return { accessToken, resource: row.resource };
  }

  // Refresh
  const tokens = await refreshTokens(provider, row.client_id, refreshToken);
  const newExpires = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;
  const accessCipher = await encryptToken(tokens.access_token);
  const refreshCipher = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : row.refresh_token_ciphertext ?? null;

  const { error: upErr } = await supabaseAdmin
    .from("mcp_connections")
    .update({
      access_token: "", // legacy column no longer used
      refresh_token: null,
      access_token_ciphertext: accessCipher,
      refresh_token_ciphertext: refreshCipher,
      token_encryption_version: TOKEN_ENCRYPTION_VERSION,
      expires_at: newExpires,
      scope: tokens.scope ?? row.scope,
    })
    .eq("id", row.id);
  if (upErr) throw new Error(upErr.message);
  return { accessToken: tokens.access_token, resource: row.resource };
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export const listMcpTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; workspaceId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    await assertWorkspaceMembership(context.supabase, context.userId, data.workspaceId ?? null);
    const { mcpInitializeAndListTools } = await import("./mcp.server");
    const { accessToken, resource } = await loadAccessToken(
      context.userId,
      data.provider,
      data.workspaceId ?? null,
    );
    const { tools, serverInfo } = await mcpInitializeAndListTools(resource, accessToken);
    return JSON.parse(JSON.stringify({ tools, serverInfo })) as {
      tools: Array<{ name: string; title?: string; description?: string; inputSchema?: JsonValue }>;
      serverInfo?: JsonValue;
    };
  });

export const callMcpTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      provider: string;
      workspaceId?: string | null;
      name: string;
      arguments: Record<string, JsonValue>;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await assertWorkspaceMembership(context.supabase, context.userId, data.workspaceId ?? null);
    const { mcpCallTool } = await import("./mcp.server");
    const { accessToken, resource } = await loadAccessToken(
      context.userId,
      data.provider,
      data.workspaceId ?? null,
    );
    const started = Date.now();
    try {
      const result = await mcpCallTool(resource, accessToken, data.name, data.arguments);
      console.info("[mcp.callTool]", {
        provider: data.provider,
        userId: context.userId,
        workspaceId: data.workspaceId ?? null,
        tool: data.name,
        durationMs: Date.now() - started,
        ok: true,
      });
      return JSON.parse(JSON.stringify({ result })) as { result: JsonValue };
    } catch (e) {
      console.warn("[mcp.callTool]", {
        provider: data.provider,
        userId: context.userId,
        workspaceId: data.workspaceId ?? null,
        tool: data.name,
        durationMs: Date.now() - started,
        ok: false,
        error: (e as Error).message,
      });
      throw e;
    }
  });

export const disconnectMcp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; workspaceId?: string | null }) => input)
  .handler(async ({ data, context }) => {
    await assertWorkspaceMembership(context.supabase, context.userId, data.workspaceId ?? null);
    const q = context.supabase
      .from("mcp_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    const { error } = await (data.workspaceId
      ? q.eq("workspace_id", data.workspaceId)
      : q.is("workspace_id", null));
    if (error) throw new Error(error.message);
    return { ok: true };
  });
