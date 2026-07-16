// Server functions for the Creator MCP dedicated UI.
// Lists tools and executes them via the shared MCP transport.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toMcpErrorPayload } from "./mcp-client/errors";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: { code: string; message: string } };
type Result<T> = Ok<T> | Err;

const PROVIDER = "creator";

function safe<T>(fn: () => Promise<T>): Promise<Result<T>> {
  return fn().then(
    (data) => ({ ok: true as const, data }),
    (err) => ({ ok: false as const, error: toMcpErrorPayload(err) }),
  );
}

export const creatorConnectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("mcp_connections")
      .select("id, updated_at, expires_at")
      .eq("user_id", context.userId)
      .eq("provider", PROVIDER)
      .limit(1);
    const row = data?.[0];
    if (!row) return { connected: false as const };
    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
    const expiringSoon =
      expiresAt !== null && expiresAt - Date.now() < 5 * 60 * 1000;
    return {
      connected: true as const,
      expiringSoon,
      updatedAt: row.updated_at,
    };
  });

export type CreatorToolDescriptor = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
};

export const listCreatorTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Result<CreatorToolDescriptor[]>> => {
    return safe(async () => {
      const { getMcpCredentials, listAvailableTools } = await import(
        "./mcp-client/transport.server"
      );
      const creds = await getMcpCredentials(context.userId, PROVIDER);
      const tools = await listAvailableTools(creds);
      return tools as CreatorToolDescriptor[];
    });
  });

export const runCreatorTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { name: string; args: Record<string, unknown> }) => input,
  )
  .handler(async ({ data, context }): Promise<Result<unknown>> => {
    return safe(async () => {
      const { callMcpTool } = await import("./mcp-client/transport.server");
      return callMcpTool({
        provider: PROVIDER,
        tool: data.name,
        args: data.args ?? {},
        userId: context.userId,
        timeoutMs: 60_000,
        retries: 0,
      });
    });
  });
