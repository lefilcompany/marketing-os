import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { AeiouTool } from "@/lib/aeiou-modules";
import {
  getMcpConnection,
  listMcpTools,
  startMcpAuth,
  disconnectMcp,
} from "@/lib/mcp.functions";
import { setToolBrand } from "@/lib/tool-brand.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Plug,
  Unplug,
  ExternalLink,
  Save,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  tool: AeiouTool;
  initialBrand: string;
};

export function ToolCard({ tool, initialBrand }: Props) {
  const qc = useQueryClient();
  const Icon = tool.icon;

  const [brand, setBrand] = useState(initialBrand);
  useEffect(() => setBrand(initialBrand), [initialBrand]);

  const saveBrandFn = useServerFn(setToolBrand);
  const saveBrand = useMutation({
    mutationFn: (value: string) =>
      saveBrandFn({ data: { toolId: tool.id, brand: value } }),
    onSuccess: () => {
      toast.success(`Marca de ${tool.name} salva.`);
      qc.invalidateQueries({ queryKey: ["tool-brands"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // MCP status — só busca se a ferramenta declara mcpProvider.
  const connFn = useServerFn(getMcpConnection);
  const listFn = useServerFn(listMcpTools);
  const startFn = useServerFn(startMcpAuth);
  const disconnectFn = useServerFn(disconnectMcp);

  const provider = tool.mcpProvider;
  const conn = useQuery({
    queryKey: ["mcp-connection", provider],
    queryFn: () => connFn({ data: { provider: provider! } }),
    enabled: !!provider && tool.status === "ready",
    retry: false,
  });
  const connected = !!conn.data?.connection;
  const probe = useQuery({
    queryKey: ["mcp-tools", provider],
    queryFn: () => listFn({ data: { provider: provider! } }),
    enabled: !!provider && connected,
    retry: false,
  });

  const start = useMutation({
    mutationFn: () =>
      startFn({ data: { provider: provider!, returnTo: "/dashboard" } }),
    onSuccess: ({ authorizeUrl }) => {
      const w = window.open(authorizeUrl, "mcp-oauth", "width=520,height=720");
      if (!w) window.location.href = authorizeUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn({ data: { provider: provider! } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-connection", provider] });
      qc.invalidateQueries({ queryKey: ["mcp-tools", provider] });
      toast.success(`${tool.name} desconectado.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!provider) return;
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; provider?: string } | null;
      if (d?.type === "mcp:connected" && d.provider === provider) {
        qc.invalidateQueries({ queryKey: ["mcp-connection", provider] });
        qc.invalidateQueries({ queryKey: ["mcp-tools", provider] });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [provider, qc]);

  const brandDirty = brand.trim() !== (initialBrand ?? "").trim();

  return (
    <div
      className="relative rounded-2xl border bg-white p-5 transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col gap-4"
      style={{ borderColor: `color-mix(in oklab, ${tool.color} 20%, var(--border))` }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl shrink-0"
            style={{
              background: `color-mix(in oklab, ${tool.color} 12%, white)`,
              color: tool.color,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-semibold text-base leading-tight">
                {tool.name}
              </h4>
              <StatusBadge tool={tool} connected={connected} probing={probe.isLoading || conn.isLoading} />
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {tool.description}
            </p>
          </div>
        </div>
        {tool.platformUrl && (
          <a
            href={tool.platformUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
            title="Abrir plataforma"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </header>

      {tool.brandable && (
        <div className="flex items-center gap-2">
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca (ex.: Lefil Company)"
            className="h-9 text-sm"
          />
          <Button
            size="sm"
            variant={brandDirty ? "default" : "outline"}
            disabled={!brandDirty || saveBrand.isPending}
            onClick={() => saveBrand.mutate(brand)}
            className="gap-1.5"
          >
            {saveBrand.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tool.status === "coming_soon" && (
          <Button size="sm" variant="outline" disabled className="gap-1.5">
            <Clock3 className="h-3.5 w-3.5" />
            A conectar
          </Button>
        )}
        {tool.status === "ready" && provider && !connected && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => start.mutate()}
            disabled={start.isPending}
          >
            {start.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Conectar MCP
          </Button>
        )}
        {tool.status === "ready" && provider && connected && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
            >
              <Unplug className="h-3.5 w-3.5" />
              Desconectar
            </Button>
            {probe.data?.tools && (
              <span className="text-[11px] text-muted-foreground">
                {probe.data.tools.length} ferramenta(s) MCP
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  tool,
  connected,
  probing,
}: {
  tool: AeiouTool;
  connected: boolean;
  probing: boolean;
}) {
  if (tool.status === "coming_soon") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px] font-medium">
        <Clock3 className="h-3 w-3" />A conectar
      </Badge>
    );
  }
  if (probing) {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verificando
      </Badge>
    );
  }
  if (connected) {
    return (
      <Badge className="gap-1 text-[10px] bg-emerald-500/90 text-white border-emerald-400/40">
        <CheckCircle2 className="h-3 w-3" />
        Conectado
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <Plug className="h-3 w-3" />
      Desconectado
    </Badge>
  );
}
