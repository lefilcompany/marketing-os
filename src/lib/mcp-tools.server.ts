// MCP → AI SDK tool bridge. Server-only.
// Loads each user's ready MCP connections, lists their tools, wraps as AI SDK tools.

import { tool, jsonSchema } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MCP_PROVIDERS,
  getProvider,
  mcpCallTool,
  mcpInitializeAndListTools,
  refreshTokens,
  type McpToolDescriptor,
} from "./mcp.server";

type JsonObj = Record<string, unknown>;

async function loadAccessTokenAdmin(
  userId: string,
  providerSlug: string,
): Promise<{ accessToken: string; resource: string } | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("mcp_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", providerSlug)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error || !rows?.[0]) return null;
  const row = rows[0];

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

export type ConnectedProvider = { slug: string; name: string };

export async function listConnectedProviders(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConnectedProvider[]> {
  const { data, error } = await supabase
    .from("mcp_connections")
    .select("provider")
    .eq("user_id", userId);
  if (error || !data) return [];
  const seen = new Set<string>();
  const result: ConnectedProvider[] = [];
  for (const row of data) {
    const slug = (row as { provider: string }).provider;
    if (seen.has(slug)) continue;
    seen.add(slug);
    const cfg = MCP_PROVIDERS[slug];
    if (cfg) result.push({ slug, name: cfg.name });
  }
  return result;
}

/** Sanitize a JSON Schema so the model doesn't choke on unsupported constructs. */
function sanitizeSchema(schema: unknown): JsonObj {
  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {}, additionalProperties: true };
  }
  const s = { ...(schema as JsonObj) };
  // Strip fields that Gemini often rejects.
  delete s.$schema;
  delete s.$id;
  delete s.definitions;
  delete s.$defs;
  if (!s.type) s.type = "object";
  if (s.type === "object" && !s.properties) s.properties = {};
  return s;
}

function safeToolName(providerSlug: string, name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 40);
  return `${providerSlug}__${clean}`.slice(0, 63);
}

export async function loadMcpToolsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, ReturnType<typeof tool>>> {
  const providers = await listConnectedProviders(supabase, userId);
  const tools: Record<string, ReturnType<typeof tool>> = {};

  await Promise.all(
    providers.map(async ({ slug, name }) => {
      const creds = await loadAccessTokenAdmin(userId, slug);
      if (!creds) return;
      let descriptors: McpToolDescriptor[] = [];
      try {
        const listed = await mcpInitializeAndListTools(creds.resource, creds.accessToken);
        descriptors = listed.tools;
      } catch (err) {
        console.warn(`[mcp-tools] listTools failed for ${slug}:`, (err as Error).message);
        return;
      }

      for (const td of descriptors) {
        const toolName = safeToolName(slug, td.name);
        const isDestructive = !!(td.annotations?.destructiveHint);
        const schema = sanitizeSchema(td.inputSchema);
        const desc = `[${name}] ${td.title ?? td.name}${td.description ? ` — ${td.description}` : ""}`;

        tools[toolName] = tool({
          description: desc.slice(0, 1024),
          inputSchema: jsonSchema(schema),
          execute: async (args: unknown) => {
            if (isDestructive) {
              return {
                needsConfirmation: true,
                provider: slug,
                toolName: td.name,
                arguments: args,
                message:
                  "Esta é uma tool destrutiva — confirme antes de executar. Peça confirmação ao usuário antes de tentar novamente.",
              };
            }
            try {
              const result = await mcpCallTool(
                creds.resource,
                creds.accessToken,
                td.name,
                (args ?? {}) as Record<string, unknown>,
              );
              return { ok: true, result };
            } catch (err) {
              return { ok: false, error: (err as Error).message };
            }
          },
        });
      }
    }),
  );

  return tools;
}
