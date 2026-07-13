import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClienteAtivoProvider, CLIENTE_STORAGE_KEY } from "@/contexts/cliente-ativo-context";
import { LekpisTopBar } from "@/components/lekpis/top-bar";
import { getMcpConnection, startMcpAuth } from "@/lib/mcp.functions";
import { clienteListOptions } from "@/hooks/use-lekpis-queries";
import { Button } from "@/components/ui/button";
import { Loader2, Plug, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lekpis")({
  head: () => ({ meta: [{ title: "LeKPIs — Marketing OS" }] }),
  component: LekpisLayout,
});

function LekpisLayout() {
  const qc = useQueryClient();
  const connFn = useServerFn(getMcpConnection);
  const startFn = useServerFn(startMcpAuth);

  const connection = useQuery({
    queryKey: ["mcp-connection", "lekpis"],
    queryFn: () => connFn({ data: { provider: "lekpis" } }),
    retry: 0,
  });

  const start = useMutation({
    mutationFn: () => startFn({ data: { provider: "lekpis", returnTo: "/lekpis" } }),
    onSuccess: ({ authorizeUrl }) => {
      const w = window.open(authorizeUrl, "mcp-oauth", "width=520,height=720");
      if (!w) window.location.href = authorizeUrl;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; provider?: string } | null;
      if (
        (d?.type === "mcp:connected" && d.provider === "lekpis") ||
        d?.type === "lekpis:connected"
      ) {
        qc.invalidateQueries({ queryKey: ["mcp-connection", "lekpis"] });
        qc.invalidateQueries({ queryKey: ["lekpis"] });
        toast.success("LeKPIs conectado.");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc]);

  const connected = !!connection.data?.connection;

  if (connection.isLoading) {
    return (
      <div className="lekpis-root min-h-[calc(100dvh-4rem)] grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="lekpis-root min-h-[calc(100dvh-4rem)] grid place-items-center px-6">
        <div className="lekpis-card max-w-md text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-black/5 bg-[oklch(0.96_0.005_80)]">
            <Plug className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="lekpis-display mt-4 text-xl font-semibold">Conecte o LeKPIs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Autorize sua conta LeKPIs para carregar seus dados de canais e integrações.
          </p>
          <Button
            className="mt-4 gap-1.5"
            onClick={() => start.mutate()}
            disabled={start.isPending}
          >
            {start.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Conectar LeKPIs
          </Button>
        </div>
      </div>
    );
  }

  return <SelecionarClienteGate />;
}

function SelecionarClienteGate() {
  const clientesQ = useQuery(clienteListOptions());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(CLIENTE_STORAGE_KEY);
  });

  const items = clientesQ.data?.items ?? [];

  // Se o cliente salvo não existe mais na lista, limpa.
  useEffect(() => {
    if (!selectedId || clientesQ.isLoading) return;
    if (items.length > 0 && !items.some((c) => c.id === selectedId)) {
      try {
        window.localStorage.removeItem(CLIENTE_STORAGE_KEY);
      } catch { /* noop */ }
      setSelectedId(null);
    }
  }, [selectedId, items, clientesQ.isLoading]);

  if (clientesQ.isLoading) {
    return (
      <div className="lekpis-root min-h-[calc(100dvh-4rem)] grid place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clientesQ.isError) {
    return (
      <div className="lekpis-root min-h-[calc(100dvh-4rem)] grid place-items-center px-6">
        <div className="lekpis-card max-w-md text-center">
          <h1 className="lekpis-display text-xl font-semibold">Erro ao carregar clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {(clientesQ.error as Error)?.message ?? "Tente novamente em instantes."}
          </p>
          <Button className="mt-4" size="sm" onClick={() => clientesQ.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="lekpis-root min-h-[calc(100dvh-4rem)] grid place-items-center px-6">
        <div className="lekpis-card max-w-md text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-black/5 bg-[oklch(0.96_0.005_80)]">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="lekpis-display mt-4 text-xl font-semibold">
            Você ainda não tem clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro cliente para começar a monitorar canais e integrações.
          </p>
          <Button asChild className="mt-4 gap-1.5">
            <Link to="/lekpis/perfil">
              Criar primeiro cliente <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedId) {
    return (
      <div className="lekpis-root min-h-[calc(100dvh-4rem)] px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Escolha um cliente
            </p>
            <h1 className="lekpis-display mt-1 text-2xl font-semibold tracking-tight">
              Qual cliente você quer monitorar?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Você pode trocar de cliente a qualquer momento pela barra superior.
            </p>
          </div>

          <div className="lekpis-card p-0 divide-y divide-black/5">
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  try {
                    window.localStorage.setItem(CLIENTE_STORAGE_KEY, c.id);
                  } catch { /* noop */ }
                  setSelectedId(c.id);
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[oklch(0.98_0.003_80)] transition-colors"
              >
                <div>
                  <p className="font-medium">{c.nome ?? c.id}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <Button asChild variant="ghost" size="sm">
              <Link to="/lekpis/perfil">Gerenciar clientes</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClienteAtivoProvider clienteId={selectedId}>
      <div className="lekpis-root min-h-[calc(100dvh-4rem)]">
        <LekpisTopBar />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </ClienteAtivoProvider>
  );
}
