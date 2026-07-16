// Server-only helpers for MCP OAuth + Streamable HTTP proxy.
// Do not import from client code — this file has the `.server` suffix so the
// bundler strips it from client bundles.

export type McpProviderConfig = {
  slug: string;
  name: string;
  authorizationServer: string;
  resource: string; // MCP endpoint URL
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint: string;
  scope: string;
  /** Env var name whose value is sent as the Supabase `apikey` header on OAuth calls. */
  apiKeyEnv?: string;
  /** Public anon key fallback for external MCP apps; safe to ship, required when env is absent. */
  apiKeyFallback?: string;
};

export const MCP_PROVIDERS: Record<string, McpProviderConfig> = {
  deepersona: {
    slug: "deepersona",
    name: "DeePersona",
    authorizationServer: "https://poplveakypbszmltpjco.supabase.co/auth/v1",
    resource: "https://poplveakypbszmltpjco.supabase.co/functions/v1/mcp",
    authorizationEndpoint:
      "https://poplveakypbszmltpjco.supabase.co/auth/v1/oauth/authorize",
    tokenEndpoint: "https://poplveakypbszmltpjco.supabase.co/auth/v1/oauth/token",
    registrationEndpoint:
      "https://poplveakypbszmltpjco.supabase.co/auth/v1/oauth/clients/register",
    scope: "openid profile email",
    apiKeyEnv: "DEEPERSONA_SUPABASE_ANON_KEY",
    apiKeyFallback:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcGx2ZWFreXBic3ptbHRwamNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMDQyNjgsImV4cCI6MjA5MzU4MDI2OH0.inJXTr9w8DWjSS4-TE7ntfSywRY2Gts9tlYd6U0CraI",
  },
  soma: {
    slug: "soma",
    name: "Soma",
    authorizationServer: "https://erxhxmetrvkigjwxchbj.supabase.co/auth/v1",
    resource: "https://erxhxmetrvkigjwxchbj.supabase.co/functions/v1/mcp",
    authorizationEndpoint:
      "https://erxhxmetrvkigjwxchbj.supabase.co/auth/v1/oauth/authorize",
    tokenEndpoint: "https://erxhxmetrvkigjwxchbj.supabase.co/auth/v1/oauth/token",
    registrationEndpoint:
      "https://erxhxmetrvkigjwxchbj.supabase.co/auth/v1/oauth/clients/register",
    scope: "openid profile email",
    apiKeyEnv: "SOMA_SUPABASE_ANON_KEY",
    apiKeyFallback:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyeGh4bWV0cnZraWdqd3hjaGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MzcyMjksImV4cCI6MjA5NzIxMzIyOX0.v-2CmWC1n9fRTnvC8YNIMdvE-tidObfLSTdta-VYh2w",
  },
  lekpis: {
    slug: "lekpis",
    name: "LeKPIs",
    authorizationServer: "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1",
    resource: "https://phsqbgdjsohmjjoeeqqc.supabase.co/functions/v1/mcp",
    authorizationEndpoint:
      "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/authorize",
    tokenEndpoint: "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/token",
    registrationEndpoint:
      "https://phsqbgdjsohmjjoeeqqc.supabase.co/auth/v1/oauth/clients/register",
    scope: "openid profile email",
    apiKeyEnv: "LEKPIS_SUPABASE_ANON_KEY",
  },
  monitornews: {
    slug: "monitornews",
    name: "MonitorNews",
    authorizationServer: "https://dvuaudcncwzferlagmck.supabase.co/auth/v1",
    resource: "https://dvuaudcncwzferlagmck.supabase.co/functions/v1/mcp",
    authorizationEndpoint:
      "https://dvuaudcncwzferlagmck.supabase.co/auth/v1/oauth/authorize",
    tokenEndpoint: "https://dvuaudcncwzferlagmck.supabase.co/auth/v1/oauth/token",
    registrationEndpoint:
      "https://dvuaudcncwzferlagmck.supabase.co/auth/v1/oauth/clients/register",
    scope: "openid profile email",
    apiKeyEnv: "MONITORNEWS_SUPABASE_ANON_KEY",
  },

};


function providerApiKey(provider: McpProviderConfig): string | undefined {
  return provider.apiKeyEnv ? process.env[provider.apiKeyEnv] ?? provider.apiKeyFallback : provider.apiKeyFallback;
}

function withApiKey(
  provider: McpProviderConfig,
  headers: Record<string, string>,
): Record<string, string> {
  const key = providerApiKey(provider);
  return key ? { ...headers, apikey: key, Authorization: `Bearer ${key}` } : headers;
}

export function getProvider(slug: string): McpProviderConfig {
  const p = MCP_PROVIDERS[slug];
  if (!p) throw new Error(`Unknown MCP provider: ${slug}`);
  return p;
}

// -------- PKCE helpers --------

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return b64url(buf);
}

export async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(48);
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return { verifier, challenge: b64url(digest) };
}

// -------- Dynamic Client Registration --------

export async function registerClient(
  provider: McpProviderConfig,
  redirectUri: string,
): Promise<string> {
  const res = await fetch(provider.registrationEndpoint, {
    method: "POST",
    headers: withApiKey(provider, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      client_name: "Marketing OS",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "web",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DCR falhou (${res.status}): ${body}`);
  }
  const json = (await res.json()) as { client_id?: string };
  if (!json.client_id) throw new Error("DCR não retornou client_id");
  return json.client_id;
}

// -------- Token exchange / refresh --------

export type TokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

export async function exchangeCode(
  provider: McpProviderConfig,
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });
  const res = await fetch(provider.tokenEndpoint, {
    method: "POST",
    headers: withApiKey(provider, {
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Troca de código falhou (${res.status}): ${text}`);
  return JSON.parse(text) as TokenResponse;
}

export async function refreshTokens(
  provider: McpProviderConfig,
  clientId: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(provider.tokenEndpoint, {
    method: "POST",
    headers: withApiKey(provider, {
      "Content-Type": "application/x-www-form-urlencoded",
    }),
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Refresh falhou (${res.status}): ${text}`);
  return JSON.parse(text) as TokenResponse;
}

// -------- MCP Streamable HTTP client --------

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: unknown;
};

type JsonRpcResponse<T = unknown> = {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

function parseMcpBody(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Response may be JSON or SSE stream ("event:...\ndata: {json}").
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }
  // Parse SSE: find last "data:" line with JSON.
  const lines = trimmed.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith("data:")) {
      const payload = line.slice(5).trim();
      if (payload.startsWith("{") || payload.startsWith("[")) {
        return JSON.parse(payload);
      }
    }
  }
  throw new Error(`Resposta MCP inesperada: ${trimmed.slice(0, 300)}`);
}

async function mcpFetch(
  resource: string,
  accessToken: string,
  payload: JsonRpcRequest,
  sessionId?: string,
  protocolVersion?: string,
): Promise<{ body: JsonRpcResponse; sessionId?: string }> {
  const apiKey = apiKeyForResource(resource);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${accessToken}`,
    ...(apiKey ? { apikey: apiKey } : {}),
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  if (protocolVersion) headers["Mcp-Protocol-Version"] = protocolVersion;

  const res = await fetch(resource, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  const newSession = res.headers.get("mcp-session-id") ?? undefined;
  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  const parsed = parseMcpBody(raw) as JsonRpcResponse;
  if (parsed?.error) {
    throw new Error(`MCP erro: ${parsed.error.message}`);
  }
  return { body: parsed, sessionId: newSession };
}

const PROTOCOL_VERSION = "2025-06-18";

function apiKeyForResource(resource: string): string | undefined {
  for (const p of Object.values(MCP_PROVIDERS)) {
    if (resource.startsWith(new URL(p.resource).origin)) return providerApiKey(p);
  }
  return undefined;
}

/**
 * Initialize + list tools in the same session. Returns tools + session for reuse.
 */
export async function mcpInitializeAndListTools(
  resource: string,
  accessToken: string,
): Promise<{ tools: McpToolDescriptor[]; sessionId?: string; serverInfo?: unknown }> {
  const init = await mcpFetch(
    resource,
    accessToken,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "marketing-os", version: "1.0.0" },
      },
    },
    undefined,
    PROTOCOL_VERSION,
  );
  const sessionId = init.sessionId;
  const serverInfo = (init.body.result as { serverInfo?: unknown } | undefined)?.serverInfo;

  // Send notifications/initialized (best effort, ignore result).
  try {
    const apiKey = apiKeyForResource(resource);
    await fetch(resource, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        ...(apiKey ? { apikey: apiKey } : {}),
        "Mcp-Protocol-Version": PROTOCOL_VERSION,
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    });
  } catch {
    /* noop */
  }

  const listed = await mcpFetch(
    resource,
    accessToken,
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    sessionId,
    PROTOCOL_VERSION,
  );
  const result = listed.body.result as { tools?: McpToolDescriptor[] } | undefined;
  return { tools: result?.tools ?? [], sessionId, serverInfo };
}

export async function mcpCallTool(
  resource: string,
  accessToken: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  // Establish a fresh session for the call (stateless-safe).
  const init = await mcpFetch(
    resource,
    accessToken,
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "marketing-os", version: "1.0.0" },
      },
    },
    undefined,
    PROTOCOL_VERSION,
  );
  const sessionId = init.sessionId;

  const called = await mcpFetch(
    resource,
    accessToken,
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name, arguments: args },
    },
    sessionId,
    PROTOCOL_VERSION,
  );
  return called.body.result;
}

export type McpToolDescriptor = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
};
