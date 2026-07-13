import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { ClienteAtivoProvider } from "@/contexts/cliente-ativo-context";
import { LekpisTopBar } from "@/components/lekpis/top-bar";
import { getMcpConnection, startMcpAuth } from "@/lib/mcp.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Plug } from "lucide-react";

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

  return (
    <ClienteAtivoProvider>
      <div className="lekpis-root min-h-[calc(100dvh-4rem)]">
        <LekpisTopBar />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </ClienteAtivoProvider>
  );
}
