import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  facebookKpisOptions,
  instagramKpisOptions,
  metaAdsCampaignsOptions,
  type Kpi,
  type Campaign,
} from "@/hooks/use-lekpis-queries";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import { useLekpisConnect } from "@/hooks/use-lekpis-connect";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plug } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const SLUG_META = {
  instagram: { label: "Instagram", platform: "instagram" as const, kind: "kpi" as const, headline: "seguidores", secondary: ["alcance", "interacoes", "visitas_perfil"] },
  facebook: { label: "Facebook", platform: "facebook" as const, kind: "kpi" as const, headline: "fas", secondary: ["alcance", "impressoes", "interacoes"] },
  "meta-ads": { label: "Meta Ads", platform: "meta_ads" as const, kind: "campaigns" as const, headline: "investimento", secondary: ["impressoes", "cliques"] },
};

type Slug = keyof typeof SLUG_META;

export const Route = createFileRoute("/_authenticated/lekpis/canal/$slug")({
  beforeLoad: ({ params }) => {
    if (!(params.slug in SLUG_META)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [{ title: `${SLUG_META[params.slug as Slug]?.label ?? "Canal"} — LeKPIs` }],
  }),
  component: CanalDetalhe,
  notFoundComponent: () => (
    <div className="text-center py-20">
      <p className="text-sm text-muted-foreground">Canal desconhecido.</p>
      <Button asChild variant="link">
        <Link to="/lekpis">Voltar</Link>
      </Button>
    </div>
  ),
});

function CanalDetalhe() {
  const { slug } = Route.useParams();
  const meta = SLUG_META[slug as Slug];
  const { clienteId } = useClienteAtivo();
  const connect = useLekpisConnect();

  const igQ = useQuery({ ...instagramKpisOptions(clienteId), enabled: !!clienteId && slug === "instagram" });
  const fbQ = useQuery({ ...facebookKpisOptions(clienteId), enabled: !!clienteId && slug === "facebook" });
  const maQ = useQuery({ ...metaAdsCampaignsOptions(clienteId), enabled: !!clienteId && slug === "meta-ads" });

  const query = slug === "instagram" ? igQ : slug === "facebook" ? fbQ : maQ;
  const items: any[] = (query.data as any)?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link
            to="/lekpis"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
          <h1 className="lekpis-display mt-1 text-2xl font-semibold tracking-tight">
            {meta.label}
          </h1>
        </div>
      </div>

      {query.isLoading ? (
        <div className="lekpis-card lekpis-shimmer h-40" />
      ) : items.length === 0 ? (
        <EmptyChannel
          label={meta.label}
          onConnect={() => clienteId && connect(meta.platform, clienteId)}
        />
      ) : meta.kind === "kpi" ? (
        <KpiView items={items as Kpi[]} headline={meta.headline} secondary={meta.secondary} />
      ) : (
        <CampaignsView items={items as Campaign[]} />
      )}
    </div>
  );
}

function EmptyChannel({ label, onConnect }: { label: string; onConnect: () => void }) {
  return (
    <div className="lekpis-card text-center py-14">
      <p className="lekpis-display text-lg font-semibold">Nenhum dado disponível</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Conecte {label} via LeKPIs para começar a acompanhar seus indicadores.
      </p>
      <Button onClick={onConnect} className="mt-5 gap-1.5">
        <Plug className="h-4 w-4" />
        Conectar via LeKPIs
      </Button>
    </div>
  );
}

function KpiView({ items, headline, secondary }: { items: Kpi[]; headline: string; secondary: string[] }) {
  const sorted = [...items].sort((a, b) => {
    const ax = a.period_end ?? a.data_ref ?? "";
    const bx = b.period_end ?? b.data_ref ?? "";
    return String(ax).localeCompare(String(bx));
  });

  const chartData = sorted.map((k) => ({
    label: k.period_end ?? k.data_ref ?? "",
    valor: Number(k[headline as keyof Kpi] ?? 0),
  }));

  return (
    <>
      <div className="lekpis-card">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Evolução — {labelize(headline)}
        </p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke="oklch(0.94 0.005 260)" vertical={false} />
              <XAxis dataKey="label" fontSize={11} stroke="oklch(0.6 0.02 260)" tickMargin={8} />
              <YAxis fontSize={11} stroke="oklch(0.6 0.02 260)" />
              <Tooltip
                contentStyle={{
                  background: "oklch(1 0 0)",
                  border: "1px solid oklch(0.9 0.01 260)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="oklch(0.75 0.14 65)"
                strokeWidth={2}
                dot={{ r: 3, fill: "oklch(0.75 0.14 65)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lekpis-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 font-medium">Período</th>
              <th className="pb-3 font-medium">{labelize(headline)}</th>
              {secondary.map((k) => (
                <th key={k} className="pb-3 font-medium">
                  {labelize(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="lekpis-num">
            {sorted.map((row, i) => (
              <tr key={row.id ?? i} className="border-t border-black/5">
                <td className="py-2.5 text-muted-foreground">
                  {row.period_start ? `${row.period_start} → ${row.period_end ?? ""}` : row.data_ref ?? "—"}
                </td>
                <td className="py-2.5 font-medium">{fmt(row[headline as keyof Kpi] as number | null)}</td>
                {secondary.map((k) => (
                  <td key={k} className="py-2.5">
                    {fmt(row[k as keyof Kpi] as number | null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CampaignsView({ items }: { items: Campaign[] }) {
  const total = items.reduce(
    (acc, c) => acc + (c.investimento ?? c.spend ?? c.gasto ?? 0),
    0,
  );
  return (
    <>
      <div className="lekpis-card">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Investimento total
        </p>
        <p className="lekpis-num mt-2 text-4xl font-semibold tracking-tight">
          {fmtBRL(total)}
        </p>
      </div>
      <div className="lekpis-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 font-medium">Campanha</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Investimento</th>
              <th className="pb-3 font-medium">Impressões</th>
              <th className="pb-3 font-medium">Cliques</th>
            </tr>
          </thead>
          <tbody className="lekpis-num">
            {items.map((c, i) => (
              <tr key={c.id ?? i} className="border-t border-black/5">
                <td className="py-2.5 font-medium">{c.nome ?? "—"}</td>
                <td className="py-2.5 text-muted-foreground">{c.status ?? "—"}</td>
                <td className="py-2.5">{fmtBRL(c.investimento ?? c.spend ?? c.gasto ?? 0)}</td>
                <td className="py-2.5">{fmt(c.impressoes)}</td>
                <td className="py-2.5">{fmt(c.cliques)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function labelize(k: string) {
  const map: Record<string, string> = {
    seguidores: "Seguidores",
    fas: "Fãs",
    investimento: "Investimento",
    alcance: "Alcance",
    impressoes: "Impressões",
    interacoes: "Interações",
    visitas_perfil: "Visitas ao perfil",
    cliques: "Cliques",
  };
  return map[k] ?? k;
}
function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}
function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}
