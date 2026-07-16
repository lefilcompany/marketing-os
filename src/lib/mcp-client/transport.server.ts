// MCP Client transport — server-only.
// Loads credentials from mcp_connections, invokes tools with timeout, validates output.

import type { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpClientError } from "./errors";
import {
  getProvider,
  mcpCallTool,
  mcpInitializeAndListTools,
  refreshTokens,
  type McpToolDescriptor,
} from "@/lib/mcp.server";

export type McpCreds = { resource: string; accessToken: string };

/** Load a user's ready access token for a provider, refreshing near expiry. */
export async function getMcpCredentials(
  userId: string,
  providerSlug: string,
): Promise<McpCreds> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("mcp_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", providerSlug)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw new McpClientError("MCP_UNKNOWN", error.message);
  const row = rows?.[0];
  if (!row) throw new McpClientError("MCP_NOT_CONNECTED", `MCP "${providerSlug}" não conectado.`);

  const now = Date.now();
  const expMs = row.expires_at ? new Date(row.expires_at).getTime() : Infinity;
  if (expMs - now > 30_000 || !row.refresh_token) {
    return { accessToken: row.access_token, resource: row.resource };
  }
  try {
    const provider = getProvider(providerSlug);
    const tokens = await refreshTokens(provider, row.client_id, row.refresh_token);
    const newExpires = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;
    await supabaseAdmin
      .from("mcp_connections")
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? row.refresh_token,
        expires_at: newExpires,
        scope: tokens.scope ?? row.scope,
      })
      .eq("id", row.id);
    return { accessToken: tokens.access_token, resource: row.resource };
  } catch {
    return { accessToken: row.access_token, resource: row.resource };
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new McpClientError("MCP_TIMEOUT", `${label} excedeu ${ms}ms`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

type McpToolResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
};

/** Extract the first JSON payload from a tool result: prefer structuredContent, else parse content[0].text. */
function extractJson(result: unknown): unknown {
  const r = result as McpToolResult;
  if (r?.isError) {
    const msg =
      r.content?.find((c) => c.type === "text")?.text ?? "Tool retornou erro";
    throw new McpClientError("MCP_TOOL_ERROR", msg);
  }
  if (r?.structuredContent !== undefined) return r.structuredContent;
  const text = r?.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type CallMcpToolOptions<TOut> = {
  provider: string;
  tool: string;
  args?: Record<string, unknown>;
  outputSchema?: z.ZodType<TOut>;
  timeoutMs?: number;
  retries?: number;
  creds?: McpCreds;
  userId?: string;
};

/** High-level: call a tool with timeout + validation. Provide either creds or userId. */
export async function callMcpTool<TOut = unknown>(
  opts: CallMcpToolOptions<TOut>,
): Promise<TOut> {
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const retries = opts.retries ?? 1;
  const creds =
    opts.creds ?? (opts.userId ? await getMcpCredentials(opts.userId, opts.provider) : null);
  if (!creds) throw new McpClientError("MCP_NOT_CONNECTED", "Credenciais MCP ausentes.");

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await withTimeout(
        mcpCallTool(creds.resource, creds.accessToken, opts.tool, opts.args ?? {}),
        timeoutMs,
        `tools/call ${opts.tool}`,
      );
      const parsed = extractJson(raw);
      if (!opts.outputSchema) return parsed as TOut;
      const check = opts.outputSchema.safeParse(parsed);
      if (!check.success) {
        throw new McpClientError(
          "MCP_VALIDATION_ERROR",
          `Resposta de ${opts.tool} fora do schema esperado.`,
          check.error.issues,
        );
      }
      return check.data;
    } catch (err) {
      lastErr = err;
      const isTransient =
        err instanceof McpClientError &&
        (err.code === "MCP_TIMEOUT" || err.code === "MCP_NETWORK_ERROR");
      if (!isTransient) throw err;
    }
  }
  throw lastErr;
}

export async function listAvailableTools(
  creds: McpCreds,
): Promise<McpToolDescriptor[]> {
  const { tools } = await mcpInitializeAndListTools(creds.resource, creds.accessToken);
  return tools;
}

export async function ensureProviderConnected(
  supabase: SupabaseClient,
  userId: string,
  providerSlug: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("mcp_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", providerSlug)
    .limit(1);
  return !!data?.[0];
}
