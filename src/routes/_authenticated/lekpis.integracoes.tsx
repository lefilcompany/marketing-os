import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useIntegracoes,
  useDisconnectIntegracao,
  type Integracao,
} from "@/hooks/use-lekpis-queries";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import { useLekpisConnect, type LekpisPlatform } from "@/hooks/use-lekpis-connect";
import { IntegracaoCard } from "@/components/lekpis/integracao-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/lekpis/integracoes")({
  head: () => ({ meta: [{ title: "Integrações — LeKPIs" }] }),
  component: IntegracoesPage,
});

const PLATFORMS: LekpisPlatform[] = ["instagram", "facebook", "meta_ads"];

function IntegracoesPage() {
  const { clienteId, ensureError, ensuring, ensureDefault } = useClienteAtivo();
  const { data, isLoading } = useIntegracoes(clienteId);
  const connect = useLekpisConnect();
  const disconnect = useDisconnectIntegracao();

  const byPlatform = new Map<string, Integracao>();
  for (const i of data?.items ?? []) byPlatform.set(i.platform, i);

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

      {ensureError && !clienteId && (
        <div className="lekpis-card border-amber-300 bg-amber-50/60">
          <p className="lekpis-display font-semibold text-amber-900">
            Nenhum cliente ativo
          </p>
          <p className="mt-1 text-sm text-amber-800/80">
            Não foi possível carregar um cliente padrão do LeKPIs.
            {ensureError.message ? ` (${ensureError.message})` : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => ensureDefault()} disabled={ensuring}>
              {ensuring ? "Tentando..." : "Tentar novamente"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/lekpis/perfil">Ir para Perfil</Link>
            </Button>
          </div>
        </div>
      )}

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
              />
            ))}
      </div>
    </div>
  );
}
