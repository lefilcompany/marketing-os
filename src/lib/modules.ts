// Client-safe module catalog for Marketing OS.
// Cores usam variáveis CSS definidas em src/styles.css.

import {
  Users,
  Target,
  PenTool,
  Layers,
  MessagesSquare,
  BarChart3,
  Sparkles,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

export type ModuleSlug =
  | "deepersona"
  | "estrategia"
  | "creator"
  | "soma"
  | "comunidades"
  | "lekpis"
  | "ia"
  | "biblioteca";

export type ModuleDef = {
  slug: ModuleSlug;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** CSS color expression (var/oklch) used for glows, borders, gradients. */
  color: string;
  route: string;
  status: "active" | "beta" | "soon";
  /** Chave usada em `copilot_recommendations.module` para filtrar. */
  moduleKey: string;
  /** URL externa da plataforma dedicada do módulo, quando existir. */
  platformUrl?: string;
  /** Sugestão de URL MCP externa (o usuário pode sobrescrever na UI). */
  suggestedMcpUrl?: string;
};

export const MODULES: ModuleDef[] = [
  {
    slug: "deepersona",
    name: "DeePersona",
    tagline: "Conheça seus clientes.",
    description: "Personas vivas construídas com dados, entrevistas e IA.",
    icon: Users,
    color: "var(--brand-deepersona)",
    route: "/deepersona",
    status: "active",
    moduleKey: "deepersona",
    platformUrl: "https://pla.deepersona.lefil.com.br",
    suggestedMcpUrl: "https://pla.deepersona.lefil.com.br/mcp",
  },
  {
    slug: "estrategia",
    name: "Estratégia",
    tagline: "Transforme conhecimento em plano.",
    description: "Objetivos, posicionamento e frameworks AEIOU · CRISC · PARTE.",
    icon: Target,
    color: "oklch(0.62 0.19 25)",
    route: "/estrategia",
    status: "active",
    moduleKey: "estrategia",
  },
  {
    slug: "creator",
    name: "Creator",
    tagline: "Produza com IA.",
    description: "Conteúdo, campanhas, roteiros e materiais comerciais.",
    icon: PenTool,
    color: "var(--brand-creator)",
    route: "/creator",
    status: "active",
    moduleKey: "creator",
    platformUrl: "https://pla.creator.lefil.com.br",
    suggestedMcpUrl: "https://pla.creator.lefil.com.br/mcp",
  },
  {
    slug: "soma",
    name: "Soma",
    tagline: "Execute.",
    description: "Projetos, tarefas e fluxos com aprovação e automação.",
    icon: Layers,
    color: "var(--brand-soma)",
    route: "/soma",
    status: "active",
    moduleKey: "soma",
    platformUrl: "https://pla.soma.lefil.com.br",
    suggestedMcpUrl: "https://pla.soma.lefil.com.br/mcp",
  },
  {
    slug: "comunidades",
    name: "Comunidades",
    tagline: "Relacione-se.",
    description: "Comunidades, eventos, embaixadores e jornadas.",
    icon: MessagesSquare,
    color: "oklch(0.7 0.18 340)",
    route: "/comunidades",
    status: "active",
    moduleKey: "comunidades",
  },
  {
    slug: "ia",
    name: "IA",
    tagline: "Seu copiloto.",
    description: "Acompanha, sugere e age em todos os módulos.",
    icon: Sparkles,
    color: "oklch(0.7 0.18 195)",
    route: "/ia",
    status: "active",
    moduleKey: "ia",
  },
  {
    slug: "biblioteca",
    name: "Biblioteca",
    tagline: "Seu repositório único.",
    description: "Personas, estratégias, templates, prompts e cases.",
    icon: BookMarked,
    color: "oklch(0.62 0.06 260)",
    route: "/biblioteca",
    status: "active",
    moduleKey: "biblioteca",
  },
];

export function getModule(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
