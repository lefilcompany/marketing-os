// Safe parsing of MCP tools/call results.
// Priority: structuredContent → direct JSON object result → content[].text (JSON) → content[].text (string).
// Never uses eval; never trusts HTML.

export type UnwrappedResult<T> =
  | { ok: true; data: T; text?: string }
  | { ok: false; error: string };

type ContentItem = { type?: string; text?: string; data?: unknown };

function tryJson(s: string): unknown | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  if (trimmed[0] !== "{" && trimmed[0] !== "[") return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

/** Best-effort unwrap of an MCP tools/call result. */
export function unwrapMcpToolResult<T = unknown>(raw: unknown): UnwrappedResult<T> {
  if (raw === null || raw === undefined) return { ok: false, error: "Resposta MCP vazia." };

  const r = raw as {
    isError?: boolean;
    structuredContent?: unknown;
    content?: ContentItem[];
  };

  const errorText = (): string => {
    const parts = (r.content ?? [])
      .filter((c) => c?.type === "text" && typeof c?.text === "string")
      .map((c) => c.text as string);
    return parts.join("\n").trim() || "Erro ao executar a operação.";
  };

  if (r.isError) return { ok: false, error: errorText() };

  if (r.structuredContent !== undefined && r.structuredContent !== null) {
    return { ok: true, data: r.structuredContent as T };
  }

  // Sometimes servers return the payload as the root object directly.
  if (typeof raw === "object" && !Array.isArray(raw) && !r.content) {
    return { ok: true, data: raw as T };
  }

  if (Array.isArray(r.content) && r.content.length > 0) {
    // Try structured JSON inside text items first.
    for (const item of r.content) {
      if (item?.type === "text" && typeof item.text === "string") {
        const parsed = tryJson(item.text);
        if (parsed !== undefined) return { ok: true, data: parsed as T, text: item.text };
      }
    }
    // Fallback to raw text (useful for message-style responses).
    const text = r.content
      .filter((c) => c?.type === "text" && typeof c?.text === "string")
      .map((c) => c.text as string)
      .join("\n");
    if (text) return { ok: true, data: text as unknown as T, text };
  }

  return { ok: false, error: "Formato de resposta MCP não reconhecido." };
}
