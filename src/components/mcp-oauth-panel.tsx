import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  startMcpAuth,
  getMcpConnection,
  listMcpTools,
  callMcpTool,
  disconnectMcp,
} from "@/lib/mcp.functions";
import { McpResourceExplorer } from "@/components/mcp-resource-explorer";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plug,
  CheckCircle2,
  Play,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";

type Tool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: unknown;
};

/**
 * Painel de conexão OAuth 2.1 (PKCE + DCR) para um provedor MCP externo.
 * Fluxo:
 *  - Se não conectado: botão "Conectar" abre popup para autorização.
 *  - Se conectado: lista tools/list e permite executar cada tool via tools/call.
 */
export function McpOAuthPanel({ provider }: { provider: string }) {
  const qc = useQueryClient();

  const startFn = useServerFn(startMcpAuth);
  const connFn = useServerFn(getMcpConnection);
  const listFn = useServerFn(listMcpTools);
  const callFn = useServerFn(callMcpTool);
  const disconnectFn = useServerFn(disconnectMcp);

  const connection = useQuery({
    queryKey: ["mcp-connection", provider],
    queryFn: () => connFn({ data: { provider } }),
  });

  const connected = !!connection.data?.connection;

  const tools = useQuery({
    queryKey: ["mcp-tools", provider],
    queryFn: () => listFn({ data: { provider } }),
    enabled: connected,
    retry: 0,
  });

  const start = useMutation({
    mutationFn: () => startFn({ data: { provider, returnTo: `/${provider}` } }),
    onSuccess: ({ authorizeUrl }) => {
      const w = window.open(authorizeUrl, "mcp-oauth", "width=520,height=720");
      if (!w) window.location.href = authorizeUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn({ data: { provider } }),
    onSuccess: () => {
      toast.success("MCP desconectado.");
      qc.invalidateQueries({ queryKey: ["mcp-connection", provider] });
      qc.invalidateQueries({ queryKey: ["mcp-tools", provider] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Recarrega quando popup avisa que autorizou.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; provider?: string } | null;
      if (d?.type === "mcp:connected" && d.provider === provider) {
        qc.invalidateQueries({ queryKey: ["mcp-connection", provider] });
        qc.invalidateQueries({ queryKey: ["mcp-tools", provider] });
        toast.success("MCP conectado!");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [provider, qc]);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-8 space-y-4">
      <div className="surface-card p-5 space-y-4">
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Conexão MCP · OAuth</h2>
              <p className="text-sm text-muted-foreground">
                Autorize o Marketing OS a executar tools no MCP do {provider}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connection.isLoading ? (
              <Badge variant="secondary" className="gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando
              </Badge>
            ) : connected ? (
              <Badge className="gap-1.5 bg-emerald-500/90 text-white border-emerald-400/40">
                <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5">
                <Plug className="h-3.5 w-3.5" /> Não conectado
              </Badge>
            )}
            {connected ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => tools.refetch()}
                  disabled={tools.isFetching}
                  className="gap-2"
                >
                  {tools.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Atualizar tools
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="gap-2"
                >
                  <Unplug className="h-4 w-4" /> Desconectar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => start.mutate()}
                disabled={start.isPending}
                className="gap-2"
              >
                {start.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Conectar
              </Button>
            )}
          </div>
        </header>

        {!connected && !connection.isLoading && (
          <p className="text-xs text-muted-foreground">
            Uma nova aba abrirá para você autorizar o acesso. Após aprovar, esta página listará as
            tools disponíveis no MCP.
          </p>
        )}

        {connected && (
          <div className="space-y-3">
            {tools.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando tools do MCP…
              </div>
            ) : tools.error ? (
              <p className="text-sm text-destructive">
                Erro ao listar tools: {(tools.error as Error).message}
              </p>
            ) : (
              <McpResourceExplorer
                provider={provider}
                tools={(tools.data?.tools ?? []) as Tool[]}
              />
            )}

          </div>
        )}
      </div>
    </section>
  );
}

function ToolsList({
  tools,
  onRun,
}: {
  tools: Tool[];
  onRun: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}) {
  if (tools.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma tool retornada por este MCP.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {tools.length} {tools.length === 1 ? "tool disponível" : "tools disponíveis"}
      </p>
      <div className="grid gap-2">
        {tools.map((t) => (
          <ToolRow key={t.name} tool={t} onRun={onRun} />
        ))}
      </div>
    </div>
  );
}

function ToolRow({
  tool,
  onRun,
}: {
  tool: Tool;
  onRun: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [args, setArgs] = useState<string>(() =>
    JSON.stringify(guessDefaults(tool.inputSchema), null, 2),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const schemaPretty = useMemo(
    () => (tool.inputSchema ? JSON.stringify(tool.inputSchema, null, 2) : null),
    [tool.inputSchema],
  );

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const parsed = args.trim() ? JSON.parse(args) : {};
      const res = await onRun(tool.name, parsed);
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-3 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 mt-1 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm">{tool.name}</span>
            {tool.title && (
              <span className="text-sm text-muted-foreground">— {tool.title}</span>
            )}
          </div>
          {tool.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tool.description}</p>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-white/10 p-3 space-y-3">
          {schemaPretty && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Schema de entrada</summary>
              <pre className="mt-2 overflow-auto rounded-md bg-black/30 p-2 text-[11px] leading-snug">
                {schemaPretty}
              </pre>
            </details>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`args-${tool.name}`} className="text-xs">
              Argumentos (JSON)
            </Label>
            <Textarea
              id={`args-${tool.name}`}
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              className="font-mono text-xs h-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={run} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Executar
            </Button>
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
          {result && (
            <pre className="max-h-72 overflow-auto rounded-md bg-black/30 p-2 text-[11px] leading-snug">
              {result}
            </pre>
          )}
        </div>
      )}
    </article>
  );
}

/** Preenche defaults simples a partir do JSON Schema (só para orientar o usuário). */
function guessDefaults(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return {};
  const s = schema as { properties?: Record<string, { type?: string; default?: unknown }> };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s.properties ?? {})) {
    if (v.default !== undefined) out[k] = v.default;
    else if (v.type === "string") out[k] = "";
    else if (v.type === "number" || v.type === "integer") out[k] = 0;
    else if (v.type === "boolean") out[k] = false;
    else if (v.type === "array") out[k] = [];
    else if (v.type === "object") out[k] = {};
  }
  return out;
}
