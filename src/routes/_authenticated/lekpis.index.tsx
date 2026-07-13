import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useIntegracoes,
  instagramKpisOptions,
  instagramKpisPreviousOptions,
  facebookKpisOptions,
  metaAdsCampaignsOptions,
  pctDelta,
  useProfile,
} from "@/hooks/use-lekpis-queries";
import { useQuery } from "@tanstack/react-query";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import { useLekpisConnect } from "@/hooks/use-lekpis-connect";
import { CanalCard } from "@/components/lekpis/canal-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lekpis/")({
  head: () => ({ meta: [{ title: "LeKPIs — Visão geral" }] }),
  component: LekpisHome,
});

const PERIODS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "mes_atual", label: "Mês atual" },
];

function LekpisHome() {
  const { clienteId, ensureError, ensuring, ensureDefault } = useClienteAtivo();
  const { data: profile } = useProfile();
  const [period, setPeriod] = useState<string>("30d");
  const connect = useLekpisConnect();

  const integ = useIntegracoes(clienteId);
  const igQ = useQuery(instagramKpisOptions(clienteId));
  const igPrevQ = useQuery(instagramKpisPreviousOptions(clienteId));
  const fbQ = useQuery(facebookKpisOptions(clienteId));
  const maQ = useQuery(metaAdsCampaignsOptions(clienteId));

  const connectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const i of integ.data?.items ?? []) set.add(i.platform);
    return set;
  }, [integ.data]);

  const ig = igQ.data?.items?.[0];
  const igPrev = igPrevQ.data?.items?.[0];
  const fb = fbQ.data?.items?.[0];
  const totalInvest = (maQ.data?.items ?? []).reduce(
    (acc, c) => acc + (c.investimento ?? c.spend ?? c.gasto ?? 0),
    0,
  );

  const nome = profile?.nome ?? "";
  const first = nome ? nome.split(" ")[0] : null;

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Visão geral
          </p>
          <h1 className="lekpis-display mt-1 text-3xl font-semibold tracking-tight">
            {first ? `Bem-vindo de volta, ${first}.` : "Bem-vindo de volta."}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Um painel simples com o que importa dos seus canais.
          </p>
        </div>

        <div className="inline-flex items-center rounded-full border bg-[oklch(1_0_0)] p-0.5 shadow-xs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                period === p.value
                  ? "bg-[oklch(0.2_0.03_260)] text-[oklch(0.99_0.005_90)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

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

      <section className="grid gap-4 sm:grid-cols-2">
        <CanalCard
          slug="instagram"
          connected={connectedSet.has("instagram")}
          loading={igQ.isLoading}
          headlineLabel="Seguidores"
          headline={ig?.seguidores != null ? fmtNum(ig.seguidores) : null}
          deltaPct={pctDelta(ig?.seguidores, igPrev?.seguidores)}
          onConnect={() => connect("instagram", clienteId)}
        />
        <CanalCard
          slug="facebook"
          connected={connectedSet.has("facebook")}
          loading={fbQ.isLoading}
          headlineLabel="Fãs"
          headline={fb?.fas != null ? fmtNum(fb.fas) : null}
          onConnect={() => connect("facebook", clienteId)}
        />
        <CanalCard
          slug="meta-ads"
          connected={connectedSet.has("meta_ads")}
          loading={maQ.isLoading}
          headlineLabel="Investimento"
          headline={totalInvest ? fmtBRL(totalInvest) : null}
          onConnect={() => connect("meta_ads", clienteId)}
        />
        <CanalCard slug="google-ads" connected={false} comingSoon />
      </section>

      <section className="lekpis-card flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[oklch(0.96_0.005_80)]">
            <Sparkles className="h-4 w-4 text-[oklch(0.75_0.14_65)]" />
          </div>
          <div>
            <p className="lekpis-display font-semibold">Integrações</p>
            <p className="text-xs text-muted-foreground">
              {integ.data?.items?.length ?? 0} plataforma(s) conectada(s)
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/lekpis/integracoes">
            Gerenciar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}
