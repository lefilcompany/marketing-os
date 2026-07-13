import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  startMcpAuth,
  getMcpConnection,
  listMcpTools,
  disconnectMcp,
} from "@/lib/mcp.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Unplug,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type Status = "loading" | "connected" | "disconnected" | "auth_failed";

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /401|403|unauthorized|invalid[_ ]?token|expired|forbidden/i.test(msg);
}

export function McpStatusCard({
  provider,
  providerName,
}: {
  provider: string;
  providerName: string;
}) {
  const qc = useQueryClient();
  const startFn = useServerFn(startMcpAuth);
  const connFn = useServerFn(getMcpConnection);
  const listFn = useServerFn(listMcpTools);
  const disconnectFn = useServerFn(disconnectMcp);

  const connection = useQuery({
    queryKey: ["mcp-connection", provider],
    queryFn: () => connFn({ data: { provider } }),
  });
  const connected = !!connection.data?.connection;

  // Só valida o token quando há conexão salva. Se falhar com 401/403, é auth_failed.
  const probe = useQuery({
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
      toast.success(`${providerName} desconectado.`);
      qc.invalidateQueries({ queryKey: ["mcp-connection", provider] });
      qc.invalidateQueries({ queryKey: ["mcp-tools", provider] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; provider?: string } | null;
      if (d?.type === "mcp:connected" && d.provider === provider) {
        qc.invalidateQueries({ queryKey: ["mcp-connection", provider] });
        qc.invalidateQueries({ queryKey: ["mcp-tools", provider] });
        toast.success(`${providerName} conectado!`);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [provider, providerName, qc]);

  const status: Status =
    connection.isLoading || (connected && probe.isLoading)
      ? "loading"
      : connected && probe.isError && isAuthError(probe.error)
        ? "auth_failed"
        : connected && !probe.isError
          ? "connected"
          : "disconnected";

  const view = {
    loading: {
      badge: (
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando
        </Badge>
      ),
      icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
      ring: "border-border/60",
      title: "Verificando conexão",
      message: `Consultando o status do MCP do ${providerName}…`,
    },
    connected: {
      badge: (
        <Badge className="gap-1.5 bg-emerald-500/90 text-white border-emerald-400/40">
          <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
        </Badge>
      ),
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      ring: "border-emerald-500/30 bg-emerald-500/5",
      title: `${providerName} conectado`,
      message: probe.data
        ? `Token válido. ${probe.data.tools?.length ?? 0} ferramenta(s) disponível(is) via MCP.`
        : `Token válido e pronto para chamar ferramentas via MCP.`,
    },
    disconnected: {
      badge: (
        <Badge variant="secondary" className="gap-1.5">
          <Plug className="h-3.5 w-3.5" /> Desconectado
        </Badge>
      ),
      icon: <Plug className="h-5 w-5 text-muted-foreground" />,
      ring: "border-border/60",
      title: `${providerName} desconectado`,
      message:
        "Nenhuma conexão salva neste workspace. Clique em Conectar para autorizar via OAuth (PKCE).",
    },
    auth_failed: {
      badge: (
        <Badge className="gap-1.5 bg-red-500/90 text-white border-red-400/40">
          <AlertTriangle className="h-3.5 w-3.5" /> Falha de autenticação
        </Badge>
      ),
      icon: <AlertTriangle className="h-5 w-5 text-red-400" />,
      ring: "border-red-500/30 bg-red-500/5",
      title: "Falha de autenticação",
      message:
        (probe.error instanceof Error ? probe.error.message : null) ??
        "O token salvo foi rejeitado pelo servidor MCP. Reconecte para autorizar novamente.",
    },
  }[status];

  return (
    <div className={`rounded-xl border p-5 ${view.ring}`}>
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/5 shrink-0">
          {view.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-base font-semibold">{view.title}</h3>
            {view.badge}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{view.message}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {status === "connected" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => probe.refetch()}
                  disabled={probe.isFetching}
                >
                  {probe.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Revalidar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  <Unplug className="h-4 w-4" /> Desconectar
                </Button>
              </>
            )}
            {status === "disconnected" && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => start.mutate()}
                disabled={start.isPending}
              >
                {start.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                Conectar {providerName}
              </Button>
            )}
            {status === "auth_failed" && (
              <>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => start.mutate()}
                  disabled={start.isPending}
                >
                  {start.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reconectar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  <Unplug className="h-4 w-4" /> Remover conexão
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
