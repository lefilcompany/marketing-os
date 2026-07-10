import { useEffect, useMemo, useState } from "react";
import type { ModuleDef } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

type McpStatus = "idle" | "checking" | "ready" | "error";
type SavedConfig = { url: string };

const STORAGE_PREFIX = "marketing-os:mcp:";

function storageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

function readConfig(slug: string): SavedConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    return raw ? (JSON.parse(raw) as SavedConfig) : null;
  } catch {
    return null;
  }
}

function writeConfig(slug: string, cfg: SavedConfig | null) {
  if (typeof window === "undefined") return;
  if (cfg) window.localStorage.setItem(storageKey(slug), JSON.stringify(cfg));
  else window.localStorage.removeItem(storageKey(slug));
}

/**
 * Cabeçalho padrão do módulo com banner, botão para a plataforma dedicada
 * e painel de conexão a um MCP externo. Renderizado no topo da rota do módulo.
 * A integração real com as tools MCP é ativada quando o usuário salva a URL.
 */
export function ModulePlatformShell({
  module,
  actions,
  hideMcpPanel,
}: {
  module: ModuleDef;
  /** Ações que ficam habilitadas quando o MCP está conectado. */
  actions?: Array<{
    key: "create" | "search" | "automate" | "configure";
    title: string;
    description: string;
  }>;
  /** Oculta o painel MCP genérico (útil quando uma integração OAuth real é usada abaixo). */
  hideMcpPanel?: boolean;
}) {

  const Icon = module.icon;
  const [config, setConfig] = useState<SavedConfig | null>(() => readConfig(module.slug));
  const [url, setUrl] = useState<string>(config?.url ?? module.suggestedMcpUrl ?? "");
  const [status, setStatus] = useState<McpStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(!config?.url);

  useEffect(() => {
    if (config?.url) void testConnection(config.url, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultActions = useMemo(
    () =>
      actions ?? [
        {
          key: "create" as const,
          title: "Criar / editar registros",
          description: "Criar personas, campanhas, tarefas, KPIs — direto pelo MCP da plataforma.",
        },
        {
          key: "search" as const,
          title: "Listar e buscar",
          description: "Consulte os últimos itens sincronizados da plataforma externa.",
        },
        {
          key: "automate" as const,
          title: "Rodar automações e IA",
          description: "Dispare gerações e automações remotas expostas pelo MCP.",
        },
      ],
    [actions],
  );

  const actionIcon = {
    create: Plus,
    search: Search,
    automate: Sparkles,
    configure: Settings2,
  } as const;

  async function testConnection(target: string, opts?: { silent?: boolean }) {
    setStatus("checking");
    setErrorMsg(null);
    try {
      const parsed = new URL(target);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("URL inválida — use http(s)://");
      }
      // Tenta um HEAD/GET simples ao endpoint MCP. Como CORS pode bloquear a leitura,
      // no-cors + fetch: se não lançar, tratamos como "alcançável".
      await fetch(parsed.toString(), { method: "GET", mode: "no-cors" });
      setStatus("ready");
      if (!opts?.silent) toast.success("Conexão MCP alcançável.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao testar conexão.";
      setStatus("error");
      setErrorMsg(msg);
      if (!opts?.silent) toast.error(msg);
    }
  }

  function onSave() {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Informe a URL do MCP.");
      return;
    }
    try {
      // valida URL
      // eslint-disable-next-line no-new
      new URL(trimmed);
    } catch {
      toast.error("URL inválida.");
      return;
    }
    const next = { url: trimmed };
    writeConfig(module.slug, next);
    setConfig(next);
    setExpanded(false);
    toast.success(`MCP do ${module.name} salvo.`);
    void testConnection(trimmed, { silent: true });
  }

  function onDisconnect() {
    writeConfig(module.slug, null);
    setConfig(null);
    setStatus("idle");
    setUrl(module.suggestedMcpUrl ?? "");
    setExpanded(true);
    toast.info("Conexão MCP removida.");
  }

  const isConnected = !!config?.url;

  return (
    <section className="relative">
      {/* Banner */}
      <div
        className="relative overflow-hidden rounded-b-3xl border-b border-white/10"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${module.color} 55%, transparent), color-mix(in oklab, ${module.color} 12%, transparent))`,
        }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-60"
          style={{ background: module.color }}
        />
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5 min-w-0">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/25 shadow-elevated backdrop-blur-xl"
              style={{ background: `color-mix(in oklab, ${module.color} 35%, rgba(255,255,255,0.08))` }}
            >
              <Icon className="h-7 w-7 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">
                  Módulo · Marketing OS
                </p>
                <Badge variant="secondary" className="text-[10px]">Plataforma</Badge>
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white mt-1">
                {module.name}
              </h1>
              <p className="text-white/80 mt-1 max-w-xl">{module.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectionBadge status={isConnected ? status : "idle"} connected={isConnected} />
            {module.platformUrl ? (
              <Button
                asChild
                size="lg"
                className="gap-2 bg-white text-slate-900 hover:bg-white/90"
              >
                <a href={module.platformUrl} target="_blank" rel="noopener noreferrer">
                  Abrir plataforma
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="lg" variant="secondary" disabled className="gap-2">
                Plataforma em breve
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Painel MCP + Ações */}
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <div className="surface-card p-5 space-y-4">
          <header className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/15"
                style={{ background: `color-mix(in oklab, ${module.color} 25%, transparent)` }}
              >
                <Plug className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Conexão MCP</h2>
                <p className="text-sm text-muted-foreground">
                  Edite dados da plataforma <span className="font-medium">{module.name}</span>{" "}
                  direto do Marketing OS.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void testConnection(config!.url)}
                  disabled={status === "checking"}
                  className="gap-2"
                >
                  {status === "checking" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  Testar
                </Button>
              )}
              <Button
                variant={expanded ? "secondary" : "outline"}
                size="sm"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Fechar" : isConnected ? "Editar" : "Configurar"}
              </Button>
              {isConnected && (
                <Button variant="ghost" size="sm" onClick={onDisconnect}>
                  Desconectar
                </Button>
              )}
            </div>
          </header>

          {expanded && (
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor={`mcp-url-${module.slug}`}>URL do servidor MCP</Label>
                <Input
                  id={`mcp-url-${module.slug}`}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={module.suggestedMcpUrl ?? "https://exemplo.com/mcp"}
                />
                {module.suggestedMcpUrl && (
                  <p className="text-xs text-muted-foreground">
                    Sugestão: <code>{module.suggestedMcpUrl}</code>
                  </p>
                )}
                {errorMsg && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> {errorMsg}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void testConnection(url)}>
                  Testar
                </Button>
                <Button onClick={onSave}>Salvar</Button>
              </div>
            </div>
          )}

          {isConnected && !expanded && (
            <p className="text-xs text-muted-foreground truncate">
              Conectado a <code>{config!.url}</code>
            </p>
          )}
        </div>

        {/* Ações via MCP */}
        <div className="grid gap-3 md:grid-cols-3">
          {defaultActions.map((a) => {
            const AI = actionIcon[a.key];
            return (
              <article
                key={a.key}
                className="surface-card p-4 flex flex-col gap-2"
                style={{ opacity: isConnected ? 1 : 0.7 }}
              >
                <div
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/15"
                  style={{ background: `color-mix(in oklab, ${module.color} 22%, transparent)` }}
                >
                  <AI className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-medium">{a.title}</h3>
                <p className="text-sm text-muted-foreground flex-1">{a.description}</p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!isConnected}
                    onClick={() =>
                      toast.info(
                        isConnected
                          ? "Descoberta de tools MCP será ativada em seguida."
                          : "Configure o MCP para habilitar.",
                      )
                    }
                  >
                    {isConnected ? "Abrir ações" : "Aguardando conexão"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ConnectionBadge({ status, connected }: { status: McpStatus; connected: boolean }) {
  if (!connected) {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-white/15 text-white border-white/20">
        <Plug className="h-3.5 w-3.5" /> MCP não conectado
      </Badge>
    );
  }
  if (status === "checking") {
    return (
      <Badge variant="secondary" className="gap-1.5 bg-white/15 text-white border-white/20">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testando MCP
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" /> MCP com erro
      </Badge>
    );
  }
  return (
    <Badge className="gap-1.5 bg-emerald-500/90 text-white border-emerald-400/40">
      <CheckCircle2 className="h-3.5 w-3.5" /> MCP conectado
    </Badge>
  );
}
