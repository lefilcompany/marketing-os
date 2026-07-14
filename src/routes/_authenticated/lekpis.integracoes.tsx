import { createFileRoute } from "@tanstack/react-router";
import {
  useIntegracoes,
  useDisconnectIntegracao,
  getIntegracaoPlatform,
  type Integracao,
} from "@/hooks/use-lekpis-queries";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import { useLekpisConnect, type LekpisPlatform } from "@/hooks/use-lekpis-connect";
import { IntegracaoCard } from "@/components/lekpis/integracao-card";

export const Route = createFileRoute("/_authenticated/lekpis/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — LeKPIs" }] }),
  component: IntegracoesPage,
});

const PLATFORMS: LekpisPlatform[] = ["instagram", "facebook", "meta_ads"];

function IntegracoesPage() {
  const { clienteId } = useClienteAtivo();
  const { data, isLoading } = useIntegracoes(clienteId);
  const connect = useLekpisConnect();
  const disconnect = useDisconnectIntegracao();

  const byPlatform = new Map<string, Integracao>();
  for (const i of data?.items ?? []) {
    const platform = getIntegracaoPlatform(i);
    if (platform) byPlatform.set(platform, i);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Integrações
        </p>
        <h1 className="lekpis-display mt-1 text-2xl font-semibold tracking-tight">
          Conexões do LeKPIs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie as plataformas do cliente ativo. As conexões são feitas via LeKPIs.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? PLATFORMS.map((p) => <div key={p} className="lekpis-card lekpis-shimmer h-32" />)
          : PLATFORMS.map((p) => (
              <IntegracaoCard
                key={p}
                platform={p}
                integracao={byPlatform.get(p) ?? null}
                onConnect={() => connect(p, clienteId)}
                onDisconnect={(id) => disconnect.mutate(id)}
                disconnecting={disconnect.isPending}
                disabled={!clienteId}
              />
            ))}
      </div>
    </div>
  );
}

