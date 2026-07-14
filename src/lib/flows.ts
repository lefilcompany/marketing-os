// Definições dos três fluxos guiados.
// Cada etapa aponta para uma rota de módulo — o "modo guiado" navega
// entre esses módulos mantendo `?flow=<id>&step=<index>` na URL.

import type { ModuleSlug } from "./modules";

export type FlowStepDef = {
  key: string;
  label: string;
  /** Módulo em que a etapa acontece — usado para cor e rota. */
  module: ModuleSlug;
  /** Rota destino da etapa. Se omitido, usa a rota padrão do módulo. */
  to?: string;
  /** Rótulo curto (2-3 letras) para o nó do trilho. */
  short: string;
};

export type FlowDef = {
  id: "1" | "2" | "3";
  number: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: FlowStepDef[];
};

export const FLOWS: FlowDef[] = [
  {
    id: "1",
    number: 1,
    eyebrow: "Ciclo completo",
    title: "Planejar → Executar → Aprender",
    subtitle: "A jornada end-to-end do planejamento à análise de resultados.",
    steps: [
      { key: "persona", label: "Criar Persona", module: "deepersona", short: "DP" },
      { key: "estrategia", label: "Criar Estratégia", module: "estrategia", short: "ES" },
      { key: "campanha", label: "Criar Campanha", module: "creator", short: "CR" },
      { key: "projeto", label: "Criar Projeto", module: "soma", short: "SO" },
      { key: "executar", label: "Executar", module: "soma", short: "EX" },
      { key: "mensurar", label: "Mensurar", module: "lekpis", short: "LK" },
      { key: "aprender", label: "Aprender", module: "ia", short: "IA" },
    ],
  },
  {
    id: "2",
    number: 2,
    eyebrow: "Reação rápida",
    title: "Recuperação de KPI",
    subtitle: "A IA vê a queda, propõe a resposta, os módulos executam.",
    steps: [
      { key: "detectar", label: "Detectar queda de KPI", module: "lekpis", short: "LK" },
      { key: "causa", label: "IA identifica causa", module: "ia", short: "IA" },
      { key: "sugerir", label: "Sugere campanha", module: "ia", short: "IA" },
      { key: "criar", label: "Creator cria", module: "creator", short: "CR" },
      { key: "executar", label: "Soma executa", module: "soma", short: "SO" },
      { key: "acompanhar", label: "LeKPIs acompanha", module: "lekpis", short: "LK" },
    ],
  },
  {
    id: "3",
    number: 3,
    eyebrow: "Retenção & LTV",
    title: "Comunidade e engajamento",
    subtitle: "De nova comunidade a recomendações contínuas.",
    steps: [
      { key: "nova", label: "Nova Comunidade", module: "comunidades", short: "CM" },
      { key: "jornada", label: "Criar Jornada", module: "comunidades", short: "CM" },
      { key: "conteudo", label: "Criar Conteúdo", module: "creator", short: "CR" },
      { key: "gamificacao", label: "Gamificação", module: "comunidades", short: "CM" },
      { key: "mensurar", label: "Mensurar", module: "lekpis", short: "LK" },
      { key: "melhorias", label: "Recomendar melhorias", module: "ia", short: "IA" },
    ],
  },
];

export function getFlow(id: string | null | undefined): FlowDef | undefined {
  return FLOWS.find((f) => f.id === id);
}
