// Catálogo do dashboard organizado em 5 módulos (A · E · I · O · U).
// Cada módulo agrupa "ferramentas". Cada ferramenta pode ter:
//  - brandable: aceita um campo "marca" que o usuário digita
//  - mcpProvider: slug de MCP existente (usa o mesmo backend genérico de MCP)
//  - status: 'ready' (MCP integrado) | 'coming_soon' (MCP a conectar)
//
// Os slugs mcpProvider abaixo referenciam apenas os MCPs que já existem no
// projeto e retornam ferramentas via `listMcpTools` — DeePersona, Creator,
// Soma e LeKPIs. As demais ferramentas ficam como "a conectar".

import {
  Users,
  Newspaper,
  Target,
  PenTool,
  MessagesSquare,
  Layers,
  Megaphone,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type AeiouLetter = "A" | "E" | "I" | "O" | "U";

export type AeiouTool = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  brandable: boolean;
  mcpProvider?: string;
  status: "ready" | "coming_soon";
  route?: string;
  platformUrl?: string;
};

export type AeiouModule = {
  letter: AeiouLetter;
  name: string;
  tagline: string;
  color: string;
  tools: AeiouTool[];
};

export const AEIOU_MODULES: AeiouModule[] = [
  {
    letter: "A",
    name: "Ambiente",
    tagline: "Compreender contexto da marca, mercado e clientes.",
    color: "#E27D74",
    tools: [
      {
        id: "deepersona",
        name: "DeePersona",
        description: "Segmente e priorize personas.",
        icon: Users,
        color: "var(--brand-deepersona, oklch(0.68 0.16 260))",
        brandable: true,
        mcpProvider: "deepersona",
        status: "ready",
        platformUrl: "https://pla.deepersona.lefil.com.br",
      },
      {
        id: "monitornews",
        name: "MonitorNews",
        description: "Monitore sua marca na imprensa e redes sociais.",
        icon: Newspaper,
        color: "oklch(0.7 0.16 210)",
        brandable: true,
        status: "coming_soon",
      },
    ],
  },
  {
    letter: "E",
    name: "Estratégia",
    tagline: "Transformar conhecimento em decisões e planos.",
    color: "#E5B34B",
    tools: [
      {
        id: "strateegia",
        name: "Strateegia",
        description: "Crie estratégias com IA.",
        icon: Target,
        color: "oklch(0.62 0.19 25)",
        brandable: false,
        status: "coming_soon",
      },
    ],
  },
  {
    letter: "I",
    name: "Interações",
    tagline: "Criar conteúdos, campanhas e experiências.",
    color: "#5FA8D3",
    tools: [
      {
        id: "creator",
        name: "Creator",
        description: "Geração e edição de conteúdo.",
        icon: PenTool,
        color: "var(--brand-creator, oklch(0.7 0.17 60))",
        brandable: true,
        
        status: "ready",
        platformUrl: "https://pla.creator.lefil.com.br",
      },
      {
        id: "discourse",
        name: "Discourse",
        description: "Comunidades online para marcas.",
        icon: MessagesSquare,
        color: "oklch(0.7 0.18 340)",
        brandable: false,
        status: "coming_soon",
      },
    ],
  },
  {
    letter: "O",
    name: "Operações",
    tagline: "Transformar planos em tarefas, processos e entregas.",
    color: "#6FB56A",
    tools: [
      {
        id: "soma",
        name: "Soma",
        description: "Projetos, tarefas, responsáveis e aprovações.",
        icon: Layers,
        color: "var(--brand-soma, oklch(0.66 0.15 155))",
        brandable: true,
        mcpProvider: "soma",
        status: "ready",
        platformUrl: "https://pla.soma.lefil.com.br",
      },
      {
        id: "rd-marketing",
        name: "RD Marketing",
        description: "Automação de marketing e nutrição.",
        icon: Megaphone,
        color: "oklch(0.68 0.19 35)",
        brandable: false,
        status: "coming_soon",
      },
      {
        id: "lekpis",
        name: "LeKPIs",
        description: "Mensure resultados dos indicadores.",
        icon: BarChart3,
        color: "var(--brand-lekpi, oklch(0.7 0.17 195))",
        brandable: true,
        mcpProvider: "lekpis",
        status: "ready",
        platformUrl: "https://pla.lekpis.lefil.com.br",
      },
    ],
  },
  {
    letter: "U",
    name: "Unificação",
    tagline: "Consolidar resultados, gerar aprendizado, orientar o próximo ciclo.",
    color: "#B87A9E",
    tools: [
      {
        id: "agentu",
        name: "AgentU",
        description:
          "Agente de análises e recomendações por IA a partir dos módulos anteriores, gerando um documento Word para orientar o próximo ciclo.",
        icon: Sparkles,
        color: "oklch(0.7 0.18 300)",
        brandable: false,
        status: "coming_soon",
      },
    ],
  },
];
