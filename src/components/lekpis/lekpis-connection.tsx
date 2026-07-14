import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plug,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Facebook,
  Chrome,
  Unplug,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { useWorkspace } from "@/lib/workspace-context";
import {
  disconnectMcp,
  getMcpConnection,
  listMcpTools,
  startMcpAuth,
} from "@/lib/mcp.functions";
import {
  isTrustedBrokerUrl,
  lekpisConnectProvider,
  lekpisListAvailableAccounts,
  lekpisSelectAccount,
} from "@/lib/lekpis-mcp.functions";
import { unwrapMcpToolResult } from "@/lib/lekpis-mcp.utils";

const REQUIRED_TOOLS = [
  "connect_provider",
  "list_available_accounts",
  "select_account",
  "sync_metrics",
  "get_dashboard",
  "get_metric_series",
  "update_metric_target",
];

type Provider = { slug: "meta_ads" | "google_ads"; label: string; icon: typeof Facebook };

const PROVIDERS: Provider[] = [
  { slug: "meta_ads", label: "Meta Ads", icon: Facebook },
  { slug: "google_ads", label: "Google Ads", icon: Chrome },
];

export function LekpisConnection({ onReady }: { onReady: (ready: boolean) => void }) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const getConnFn = useServerFn(getMcpConnection);
  const startFn = useServerFn(startMcpAuth);
  const listToolsFn = useServerFn(listMcpTools);
  const disconnectFn = useServerFn(disconnectMcp);

  const connQuery = useQuery({
    queryKey: ["lekpis", "connection", currentOrgId],
    queryFn: () =>
      getConnFn({ data: { provider: "lekpis", workspaceId: currentOrgId ?? null } }),
    enabled: !!currentOrgId,
  });

  const isConnected = !!connQuery.data?.connection;

  const toolsQuery = useQuery({
    queryKey: ["lekpis", "tools", currentOrgId],
    queryFn: () =>
      listToolsFn({ data: { provider: "lekpis", workspaceId: currentOrgId ?? null } }),
    enabled: isConnected && !!currentOrgId,
    retry: 0,
  });

  const toolsNames = useMemo(
    () => new Set((toolsQuery.data?.tools ?? []).map((t) => t.name)),
    [toolsQuery.data],
  );
  // If the MCP server doesn't expose tools/list, trust the local registry.
  const listSupported = (toolsQuery.data?.tools?.length ?? 0) > 0;
  const missing = listSupported ? REQUIRED_TOOLS.filter((n) => !toolsNames.has(n)) : [];
  const ready = isConnected && !toolsQuery.isLoading && missing.length === 0;

  // Signal parent
  useMemo(() => {
    onReady(ready);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const connectMut = useMutation({
    mutationFn: async () => {
      if (!currentOrgId) throw new Error("Selecione uma empresa antes de conectar.");
      const { authorizeUrl } = await startFn({
        data: {
          provider: "lekpis",
          workspaceId: currentOrgId,
          returnTo: "/lekpis",
        },
      });
      window.location.href = authorizeUrl;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const disconnectMut = useMutation({
    mutationFn: async () => {
      await disconnectFn({
        data: { provider: "lekpis", workspaceId: currentOrgId ?? null },
      });
    },
    onSuccess: () => {
      toast.success("Conexão LeKPIs removida deste workspace.");
      qc.invalidateQueries({ queryKey: ["lekpis"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!currentOrgId) {
    return (
      <div className="surface-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Selecione uma empresa para conectar o LeKPIs.
        </p>
      </div>
    );
  }

  if (connQuery.isLoading) {
    return (
      <div className="surface-card p-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão…
      </div>
    );
  }

  if (!isConnected) {
    return (
      <section className="surface-card p-6 space-y-4">
        <header className="flex items-start gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl border bg-muted">
            <Plug className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">Conectar conta LeKPIs</h2>
              <Badge variant="secondary" className="text-[10px]">OAuth 2.1</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Faça login no LeKPIs para permitir que o Marketing OS leia seus indicadores
              deste workspace. Nenhum token do LeKPIs, Meta ou Google fica no navegador.
            </p>
          </div>
        </header>
        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending}
            className="gap-2"
          >
            {connectMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plug className="h-4 w-4" />
            )}
            Conectar conta LeKPIs
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <a
              href="https://pla.lekpis.lefil.com.br"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir plataforma <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>
    );
  }

  if (toolsQuery.isLoading) {
    return (
      <div className="surface-card p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando ferramentas do LeKPIs…
      </div>
    );
  }

  if (toolsQuery.isError) {
    return (
      <div className="surface-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <strong>Falha ao carregar ferramentas</strong>
        </div>
        <p className="text-sm text-muted-foreground">
          Não foi possível ler as ferramentas do LeKPIs. Tente reconectar.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnectMut.mutate()}
          disabled={disconnectMut.isPending}
        >
          Desconectar e tentar de novo
        </Button>
      </div>
    );
  }

  if (missing.length > 0) {
    return (
      <div className="surface-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <strong>Integração LeKPIs incompatível</strong>
        </div>
        <p className="text-sm text-muted-foreground">
          O servidor MCP do LeKPIs não expõe todas as ferramentas necessárias para esta
          versão. Continue usando a plataforma dedicada até uma atualização.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a
              href="https://pla.lekpis.lefil.com.br"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir LeKPIs <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnectMut.mutate()}
            disabled={disconnectMut.isPending}
            className="gap-2"
          >
            <Unplug className="h-3.5 w-3.5" /> Desconectar
          </Button>
        </div>
      </div>
    );
  }

  const serverInfo = toolsQuery.data?.serverInfo as { name?: string; version?: string } | undefined;
  return (
    <div className="surface-card p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge className="gap-1.5 bg-emerald-500/90 text-white border-emerald-400/40">
          <CheckCircle2 className="h-3.5 w-3.5" /> LeKPIs conectado
        </Badge>
        {serverInfo?.name && (
          <span className="text-muted-foreground text-xs">
            {serverInfo.name}
            {serverInfo.version ? ` · v${serverInfo.version}` : ""}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <a
            href="https://pla.lekpis.lefil.com.br"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir LeKPIs <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (
              window.confirm(
                "Deseja desconectar? Você deixará de visualizar os dados do LeKPIs neste workspace. As conexões Meta e Google continuam armazenadas no LeKPIs.",
              )
            ) {
              disconnectMut.mutate();
            }
          }}
          disabled={disconnectMut.isPending}
          className="gap-2"
        >
          <Unplug className="h-3.5 w-3.5" /> Desconectar
        </Button>
      </div>
    </div>
  );
}

export function LekpisProviderCards() {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const connectProv = useServerFn(lekpisConnectProvider);
  const listAccs = useServerFn(lekpisListAvailableAccounts);
  const selectAcc = useServerFn(lekpisSelectAccount);

  const [dialogProvider, setDialogProvider] = useState<Provider | null>(null);
  const [selected, setSelected] = useState<string>("");

  const accountsQuery = useQuery({
    queryKey: ["lekpis", "accounts", currentOrgId, dialogProvider?.slug],
    queryFn: () =>
      listAccs({
        data: {
          provider: dialogProvider!.slug,
          workspaceId: currentOrgId ?? null,
        },
      }),
    enabled: !!dialogProvider && !!currentOrgId,
  });

  const accounts = useMemo(() => {
    const raw = accountsQuery.data?.result;
    const unwrapped = unwrapMcpToolResult<{ accounts?: unknown[] } | unknown[]>(raw);
    if (!unwrapped.ok) return [];
    const data = unwrapped.data;
    const arr = Array.isArray(data)
      ? data
      : ((data as { accounts?: unknown[] })?.accounts ?? []);
    return (arr as Record<string, unknown>[]).map((a) => ({
      id: String(a.external_account_id ?? a.id ?? ""),
      name: String(a.name ?? a.external_account_id ?? a.id ?? "Conta"),
      currency: (a.currency as string | undefined) ?? undefined,
      status: (a.status as string | undefined) ?? undefined,
      selected: Boolean(a.selected),
    }));
  }, [accountsQuery.data]);

  const connectMut = useMutation({
    mutationFn: async (p: Provider) => {
      const returnUrl =
        typeof window !== "undefined" ? `${window.location.origin}/lekpis` : "/lekpis";
      const res = await connectProv({
        data: {
          provider: p.slug,
          workspaceId: currentOrgId ?? null,
          returnUrl,
        },
      });
      const unwrapped = unwrapMcpToolResult<{
        authorize_url?: string;
        url?: string;
        redirect_url?: string;
      }>(res.result);
      if (!unwrapped.ok) throw new Error(unwrapped.error);
      const target =
        (typeof unwrapped.data === "string" && unwrapped.data) ||
        (unwrapped.data as { authorize_url?: string; url?: string; redirect_url?: string })
          ?.authorize_url ||
        (unwrapped.data as { url?: string })?.url ||
        (unwrapped.data as { redirect_url?: string })?.redirect_url;
      if (!target || !isTrustedBrokerUrl(target)) {
        throw new Error("URL de autorização não confiável.");
      }
      window.location.href = target;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const selectMut = useMutation({
    mutationFn: async () => {
      if (!dialogProvider) return;
      if (!selected) throw new Error("Selecione uma conta.");
      await selectAcc({
        data: {
          provider: dialogProvider.slug,
          externalAccountId: selected,
          workspaceId: currentOrgId ?? null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Conta vinculada ao LeKPIs.");
      qc.invalidateQueries({ queryKey: ["lekpis"] });
      setDialogProvider(null);
      setSelected("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          return (
            <article key={p.slug} className="surface-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{p.label}</h3>
                  <p className="text-xs text-muted-foreground">
                    Conecte via LeKPIs para trazer campanhas e métricas.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => connectMut.mutate(p)}
                  disabled={connectMut.isPending}
                  className="gap-2"
                >
                  {connectMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  Conectar {p.label}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelected("");
                    setDialogProvider(p);
                  }}
                >
                  Contas disponíveis
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog
        open={!!dialogProvider}
        onOpenChange={(o) => {
          if (!o) {
            setDialogProvider(null);
            setSelected("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Contas {dialogProvider?.label} disponíveis
            </DialogTitle>
            <DialogDescription>
              Escolha a conta que o LeKPIs deve monitorar neste workspace.
            </DialogDescription>
          </DialogHeader>
          {accountsQuery.isLoading ? (
            <div className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando contas…
            </div>
          ) : accountsQuery.isError ? (
            <p className="text-sm text-destructive">
              {(accountsQuery.error as Error)?.message ??
                "Não foi possível listar as contas."}
            </p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conta encontrada. Conclua a autorização com {dialogProvider?.label}{" "}
              antes de tentar novamente.
            </p>
          ) : (
            <RadioGroup value={selected} onValueChange={setSelected} className="gap-2">
              {accounts.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                >
                  <RadioGroupItem value={a.id} id={`acc-${a.id}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {maskId(a.id)} {a.currency ? `· ${a.currency}` : ""}{" "}
                      {a.status ? `· ${a.status}` : ""}
                      {a.selected ? " · já selecionada" : ""}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogProvider(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => selectMut.mutate()}
              disabled={!selected || selectMut.isPending}
              className="gap-2"
            >
              {selectMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Selecionar conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Keep Label import used */}
      <Label className="sr-only">accounts</Label>
    </>
  );
}

function maskId(id: string): string {
  if (id.length <= 4) return id;
  return `${id.slice(0, 2)}••${id.slice(-3)}`;
}
