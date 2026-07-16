// Erros tipados do MCP Client. Puramente client-safe (sem side effects).

export type McpErrorCode =
  | "MCP_NOT_CONNECTED"
  | "MCP_TIMEOUT"
  | "MCP_TOOL_ERROR"
  | "MCP_VALIDATION_ERROR"
  | "MCP_AUTH_ERROR"
  | "MCP_TOOL_NOT_FOUND"
  | "MCP_NETWORK_ERROR"
  | "MCP_UNKNOWN";

export class McpClientError extends Error {
  code: McpErrorCode;
  detail?: unknown;
  constructor(code: McpErrorCode, message: string, detail?: unknown) {
    super(message);
    this.code = code;
    this.detail = detail;
    this.name = "McpClientError";
  }
}

export function toMcpErrorPayload(err: unknown): { code: McpErrorCode; message: string } {
  if (err instanceof McpClientError) return { code: err.code, message: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  return { code: "MCP_UNKNOWN", message: msg };
}
