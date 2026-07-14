// Registry of LeKPIs metrics known to Marketing OS.
// Categories mirror the visual layout but are populated based on what the MCP actually returns.

export type MetricCategoryId =
  | "reach"
  | "performance"
  | "funnel"
  | "content"
  | "ecommerce"
  | "growth";

export type MetricFormat = "currency" | "integer" | "percent";

export type MetricEntry = {
  key: string; // canonical metric key returned by LeKPIs
  label: string;
  category: MetricCategoryId;
  format: MetricFormat;
  higherIsBetter: boolean;
  description?: string;
};

export const METRIC_CATEGORIES: {
  id: MetricCategoryId;
  label: string;
  description: string;
}[] = [
  {
    id: "reach",
    label: "Alcance & Marca",
    description: "Quanto sua marca aparece para o público.",
  },
  {
    id: "performance",
    label: "Performance & Aquisição",
    description: "Eficiência de mídia paga e aquisição.",
  },
  {
    id: "funnel",
    label: "Funil Full-Stack",
    description: "Do topo à conversão.",
  },
  {
    id: "content",
    label: "Conteúdo & Comunidade",
    description: "Engajamento e relacionamento.",
  },
  {
    id: "ecommerce",
    label: "E-commerce & Retenção",
    description: "Receita, retenção e recompra.",
  },
  {
    id: "growth",
    label: "Growth Executivo",
    description: "Indicadores agregados para liderança.",
  },
];

export const METRIC_REGISTRY: Record<string, MetricEntry> = {
  impressions: {
    key: "impressions",
    label: "Impressões",
    category: "reach",
    format: "integer",
    higherIsBetter: true,
    description: "Total de exibições dos anúncios.",
  },
  spend: {
    key: "spend",
    label: "Investimento",
    category: "performance",
    format: "currency",
    higherIsBetter: false,
    description: "Valor gasto em mídia paga.",
  },
  clicks: {
    key: "clicks",
    label: "Cliques",
    category: "performance",
    format: "integer",
    higherIsBetter: true,
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    category: "performance",
    format: "percent",
    higherIsBetter: true,
    description: "Cliques ÷ impressões.",
  },
  cpc: {
    key: "cpc",
    label: "CPC",
    category: "performance",
    format: "currency",
    higherIsBetter: false,
    description: "Custo por clique.",
  },
};

/** Whether a category has any registered metric (used to render "em breve" state). */
export function categoryHasMetrics(id: MetricCategoryId): boolean {
  return Object.values(METRIC_REGISTRY).some((m) => m.category === id);
}

export function getMetricEntry(key: string): MetricEntry | undefined {
  // Accept common casing variations.
  return (
    METRIC_REGISTRY[key] ??
    METRIC_REGISTRY[key.toLowerCase()] ??
    METRIC_REGISTRY[key.replace(/[-\s]/g, "_").toLowerCase()]
  );
}

export function formatMetricValue(
  value: number | null | undefined,
  format: MetricFormat,
  currency: string | undefined,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (format === "currency") {
    const cur = currency && /^[A-Z]{3}$/.test(currency) ? currency : "BRL";
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${value.toFixed(2)} ${cur}`;
    }
  }
  if (format === "percent") {
    // Server may send fractions (0.023) or percentages (2.3). Detect: >1 => already percent.
    const asPercent = Math.abs(value) <= 1 ? value * 100 : value;
    return `${new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(asPercent)}%`;
  }
  // integer
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}
