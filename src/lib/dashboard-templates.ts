// Catálogo client-safe de templates de dashboard que combinam métricas
// de múltiplas plataformas em uma única visão.

import {
  Megaphone, Target, TrendingUp, Users2, ShoppingCart, LineChart,
  type LucideIcon,
} from "lucide-react";

export type DashboardMetric = {
  /** Chave estável, usada como `metric_key` em `kpi_snapshots`. */
  key: string;
  label: string;
  /** Rótulo curto da plataforma de origem (Meta Ads, GA4, HubSpot, etc). */
  platform: string;
  unit: string; // "%", "R$", "" etc.
  /** Meta de referência (opcional) usada quando não há snapshot ainda. */
  target?: number;
  /** Formato de exibição. */
  format: "number" | "currency" | "percent";
};

export type DashboardTemplate = {
  slug: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  color: string;
  metrics: DashboardMetric[];
};

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    slug: "awareness",
    name: "Alcance & Marca",
    tagline: "Impressões, alcance e engajamento por canal.",
    icon: Megaphone,
    color: "oklch(0.72 0.18 60)",
    metrics: [
      { key: "meta_impressions", label: "Impressões", platform: "Meta Ads", unit: "", format: "number", target: 500000 },
      { key: "google_impressions", label: "Impressões", platform: "Google Ads", unit: "", format: "number", target: 300000 },
      { key: "linkedin_impressions", label: "Impressões", platform: "LinkedIn", unit: "", format: "number", target: 80000 },
      { key: "ig_reach", label: "Alcance", platform: "Instagram", unit: "", format: "number", target: 150000 },
      { key: "yt_views", label: "Views", platform: "YouTube", unit: "", format: "number", target: 40000 },
      { key: "share_of_voice", label: "Share of voice", platform: "Social listening", unit: "%", format: "percent", target: 25 },
    ],
  },
  {
    slug: "performance",
    name: "Performance & Aquisição",
    tagline: "CAC, ROAS e conversões nas mídias pagas.",
    icon: Target,
    color: "var(--brand-lekpi)",
    metrics: [
      { key: "meta_roas", label: "ROAS", platform: "Meta Ads", unit: "x", format: "number", target: 4 },
      { key: "google_roas", label: "ROAS", platform: "Google Ads", unit: "x", format: "number", target: 5 },
      { key: "meta_cpa", label: "CPA", platform: "Meta Ads", unit: "R$", format: "currency", target: 35 },
      { key: "google_cpa", label: "CPA", platform: "Google Ads", unit: "R$", format: "currency", target: 40 },
      { key: "blended_cac", label: "CAC blended", platform: "Financeiro", unit: "R$", format: "currency", target: 120 },
      { key: "paid_conversions", label: "Conversões", platform: "GA4", unit: "", format: "number", target: 1200 },
    ],
  },
  {
    slug: "funnel",
    name: "Funil Full-Stack",
    tagline: "Do topo à receita — GA4, CRM e vendas.",
    icon: LineChart,
    color: "var(--brand-creator)",
    metrics: [
      { key: "ga4_sessions", label: "Sessões", platform: "GA4", unit: "", format: "number", target: 80000 },
      { key: "ga4_conv_rate", label: "Conversão de site", platform: "GA4", unit: "%", format: "percent", target: 3.2 },
      { key: "hubspot_mqls", label: "MQLs", platform: "HubSpot", unit: "", format: "number", target: 800 },
      { key: "hubspot_sqls", label: "SQLs", platform: "HubSpot", unit: "", format: "number", target: 240 },
      { key: "rd_win_rate", label: "Win rate", platform: "CRM", unit: "%", format: "percent", target: 22 },
      { key: "revenue", label: "Receita", platform: "Financeiro", unit: "R$", format: "currency", target: 250000 },
    ],
  },
  {
    slug: "community",
    name: "Conteúdo & Comunidade",
    tagline: "Engajamento orgânico, newsletter e comunidade.",
    icon: Users2,
    color: "var(--brand-deepersona)",
    metrics: [
      { key: "ig_engagement", label: "Engajamento", platform: "Instagram", unit: "%", format: "percent", target: 4.5 },
      { key: "linkedin_engagement", label: "Engajamento", platform: "LinkedIn", unit: "%", format: "percent", target: 3.8 },
      { key: "yt_watchtime", label: "Tempo assistido", platform: "YouTube", unit: "min", format: "number", target: 12000 },
      { key: "newsletter_open", label: "Taxa de abertura", platform: "E-mail", unit: "%", format: "percent", target: 38 },
      { key: "newsletter_ctr", label: "CTR", platform: "E-mail", unit: "%", format: "percent", target: 6 },
      { key: "community_active", label: "Membros ativos", platform: "Comunidade", unit: "", format: "number", target: 1500 },
    ],
  },
  {
    slug: "ecommerce",
    name: "E-commerce & Retenção",
    tagline: "AOV, LTV e recompra pelos canais transacionais.",
    icon: ShoppingCart,
    color: "var(--brand-soma)",
    metrics: [
      { key: "shopify_revenue", label: "Receita", platform: "Shopify", unit: "R$", format: "currency", target: 400000 },
      { key: "shopify_orders", label: "Pedidos", platform: "Shopify", unit: "", format: "number", target: 2400 },
      { key: "shopify_aov", label: "AOV", platform: "Shopify", unit: "R$", format: "currency", target: 210 },
      { key: "ltv_90", label: "LTV 90d", platform: "Analytics", unit: "R$", format: "currency", target: 480 },
      { key: "repurchase_rate", label: "Recompra", platform: "CRM", unit: "%", format: "percent", target: 22 },
      { key: "ads_share_revenue", label: "Receita paga", platform: "Meta + Google", unit: "%", format: "percent", target: 55 },
    ],
  },
  {
    slug: "growth",
    name: "Growth Executivo",
    tagline: "Visão de board com CAC, LTV e eficiência.",
    icon: TrendingUp,
    color: "oklch(0.7 0.18 195)",
    metrics: [
      { key: "mrr", label: "MRR", platform: "Financeiro", unit: "R$", format: "currency", target: 180000 },
      { key: "ltv_cac", label: "LTV / CAC", platform: "Financeiro", unit: "x", format: "number", target: 3.5 },
      { key: "payback_months", label: "Payback", platform: "Financeiro", unit: "meses", format: "number", target: 8 },
      { key: "nps", label: "NPS", platform: "Pesquisa", unit: "", format: "number", target: 60 },
      { key: "churn", label: "Churn", platform: "CRM", unit: "%", format: "percent", target: 3 },
      { key: "pipeline_coverage", label: "Cobertura de pipe.", platform: "CRM", unit: "x", format: "number", target: 3 },
    ],
  },
];

export function getTemplate(slug: string): DashboardTemplate | undefined {
  return DASHBOARD_TEMPLATES.find((t) => t.slug === slug);
}

export function formatMetric(m: DashboardMetric, value: number | null | undefined): string {
  if (value == null) return "—";
  const nfNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
  const nfCur = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (m.format === "currency") return nfCur.format(value);
  if (m.format === "percent") return `${nfNum.format(value)}%`;
  return `${nfNum.format(value)}${m.unit ? ` ${m.unit}` : ""}`;
}
