// Server functions for the Creator MCP dedicated UI.
// Lists tools and executes them via the shared MCP transport.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toMcpErrorPayload } from "./mcp-client/errors";

const PROVIDER = "creator";

function safe<T>(fn: () => Promise<T>) {
  return fn().then(
    (data) => ({ ok: true as const, data }),
    (err) => ({ ok: false as const, error: toMcpErrorPayload(err) }),
  );
}

export type CreatorToolDescriptor = {
  name: string;
  title?: string;
  description?: string;
  /** JSON-serialized JSON Schema (kept as string to remain wire-serializable). */
  inputSchemaJson?: string;
  /** JSON-serialized annotations. */
  annotationsJson?: string;
};

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

export const listCreatorTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return safe(async () => {
      const { getMcpCredentials, listAvailableTools } = await import(
        "./mcp-client/transport.server"
      );
      const creds = await getMcpCredentials(context.userId, PROVIDER);
      const tools = await listAvailableTools(creds);
      const serialized: CreatorToolDescriptor[] = tools.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchemaJson: t.inputSchema ? JSON.stringify(t.inputSchema) : undefined,
        annotationsJson: t.annotations ? JSON.stringify(t.annotations) : undefined,
      }));
      return serialized;
    });
  });

export const runCreatorTool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; argsJson: string }) => input)
  .handler(async ({ data, context }) => {
    return safe(async () => {
      const { callMcpTool } = await import("./mcp-client/transport.server");
      let args: Record<string, unknown> = {};
      if (data.argsJson && data.argsJson.trim()) {
        try {
          args = JSON.parse(data.argsJson);
        } catch {
          throw new Error("Argumentos inválidos: JSON malformado.");
        }
      }
      const result = await callMcpTool({
        provider: PROVIDER,
        tool: data.name,
        args,
        userId: context.userId,
        timeoutMs: 60_000,
        retries: 0,
      });
      // Serialize to string for a stable wire shape.
      return JSON.stringify(result ?? null);
    });
  });
