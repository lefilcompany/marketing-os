// Wrapper sobre o server fn `callMcpTool` que fixa provider='lekpis' e
// desempacota o resultado MCP (structuredContent → texto JSON → raw).
import { callMcpTool } from "./mcp.functions";

type McpResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
};

function unwrapEnvelope(payload: any): any {
  // LeKPIs MCP responses follow { success, data|error, requestId, timestamp }.
  if (payload && typeof payload === "object" && "success" in payload) {
    if (payload.success === false) {
      const err = (payload as any).error;
      const msg =
        (err && typeof err === "object" && (err.message || err.code)) ||
        (typeof err === "string" ? err : null) ||
        "Erro LeKPIs";
      throw new Error(String(msg));
    }
    if (payload.success === true && "data" in payload) return (payload as any).data;
  }
  return payload;
}

function unwrap(result: McpResult | unknown): any {
  const r = result as McpResult;
  if (r?.isError) {
    const msg = r.content?.map((c) => c.text).filter(Boolean).join("\n") || "Erro na tool MCP";
    throw new Error(msg);
  }
  if (r?.structuredContent !== undefined) return unwrapEnvelope(r.structuredContent);
  const text = r?.content?.[0]?.text;
  if (typeof text === "string") {
    try {
      return unwrapEnvelope(JSON.parse(text));
    } catch {
      return { text };
    }
  }
  return r;
}

export async function callLekpis<T = any>(
  name: string,
  args: Record<string, any> = {},
): Promise<T> {
  const { result } = await callMcpTool({
    data: { provider: "lekpis", name, arguments: args },
  });
  return unwrap(result) as T;
}

export class LekpisNotConnectedError extends Error {
  constructor() {
    super("LeKPIs não conectado");
    this.name = "LekpisNotConnectedError";
  }
}

export function isLekpisNotConnected(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return /não conectado|not connected|401|Unauthorized/i.test(msg);
}
