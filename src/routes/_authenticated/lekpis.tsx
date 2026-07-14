import { useEffect, useState } from "react";
import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { getModule } from "@/lib/modules";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { LekpisConnection, LekpisProviderCards } from "@/components/lekpis/lekpis-connection";
import { LekpisDashboard } from "@/components/lekpis/lekpis-dashboard";

type Search = { mcp?: "connected" | "cancelled" | "error" };

export const Route = createFileRoute("/_authenticated/lekpis")({
  validateSearch: (raw: Record<string, unknown>): Search => {
    const m = raw.mcp;
    if (m === "connected" || m === "cancelled" || m === "error") return { mcp: m };
    return {};
  },
  head: () => ({
    meta: [
      { title: "LeKPIs — Marketing OS" },
      {
        name: "description",
        content:
          "Indicadores de marketing consolidados do LeKPIs — Meta Ads, Google Ads e mais, dentro do Marketing OS.",
      },
    ],
  }),
  component: LekpisRoute,
});

function LekpisRoute() {
  const search = useSearch({ from: "/_authenticated/lekpis" });
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const module = getModule("lekpis")!;

  useEffect(() => {
    if (!search.mcp) return;
    if (search.mcp === "connected") toast.success("LeKPIs conectado.");
    if (search.mcp === "cancelled") toast.info("Autorização cancelada.");
    if (search.mcp === "error") toast.error("Não foi possível concluir a autorização.");
    // Clear param
    navigate({ to: "/lekpis", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.mcp]);

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <ModulePlatformShell module={module} hideMcpPanel />
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        <LekpisConnection onReady={setReady} />
        {ready && (
          <>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Fontes de dados
              </h2>
              <p className="text-sm text-muted-foreground">
                Conecte Meta Ads e Google Ads pelo LeKPIs. Os tokens ficam no LeKPIs; o
                Marketing OS apenas lê os indicadores consolidados.
              </p>
              <LekpisProviderCards />
            </section>
            <section className="space-y-2">
              <h2 className="font-display text-lg font-semibold">Indicadores</h2>
              <LekpisDashboard enabled={ready} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
