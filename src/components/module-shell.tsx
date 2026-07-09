import type { ModuleDef } from "@/lib/modules";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

/**
 * Casca padrão de um módulo. Nas próximas fases cada módulo terá suas próprias
 * abas e conteúdo — este componente evita botões sem função por enquanto.
 */
export function ModuleShell({ module }: { module: ModuleDef }) {
  const Icon = module.icon;
  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10 opacity-50"
        style={{
          background: `radial-gradient(60% 100% at 20% 0%, color-mix(in oklab, ${module.color} 30%, transparent), transparent 70%)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-start gap-5">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 shadow-elevated"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${module.color} 55%, transparent), color-mix(in oklab, ${module.color} 20%, transparent))`,
            }}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Módulo · Marketing OS
              </p>
              <Badge variant="secondary" className="text-[10px]">Fase 1</Badge>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              {module.name}
            </h1>
            <p className="text-muted-foreground mt-1">{module.description}</p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {upcoming(module.slug).map((item) => (
            <article
              key={item.title}
              className="surface-card p-5 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" style={{ color: module.color }} />
                Em construção
              </div>
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="surface-card p-6">
          <h2 className="font-display text-lg font-semibold">Próximos passos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Este módulo já tem estrutura de dados no banco. Nas próximas fases do MVP vamos abrir aqui os fluxos completos, com IA integrada.
          </p>
        </section>
      </div>
    </div>
  );
}

function upcoming(slug: ModuleDef["slug"]) {
  const map: Record<ModuleDef["slug"], Array<{ title: string; body: string }>> = {
    deepersona: [
      { title: "Biblioteca de Personas", body: "Personas vivas com dados, dores, ganhos e canais." },
      { title: "Criador guiado", body: "Wizard passo a passo com sugestão da IA." },
      { title: "Jornada da persona", body: "Mapa completo de descoberta a fidelização." },
    ],
    estrategia: [
      { title: "Plano estratégico", body: "Objetivos, metas, posicionamento e proposta de valor." },
      { title: "Frameworks", body: "AEIOU · CRISC · PARTE aplicados ao contexto." },
      { title: "Canais & calendário", body: "Do canal certo ao momento certo." },
    ],
    creator: [
      { title: "Geração de conteúdo", body: "Posts, e-mails, roteiros, landing e materiais comerciais." },
      { title: "Contexto automático", body: "Persona + estratégia + marca aplicados a cada peça." },
      { title: "Aprovação e publicação", body: "Fluxo de revisão e envio." },
    ],
    soma: [
      { title: "Projetos e tarefas", body: "Kanban, prazos, responsáveis e automações." },
      { title: "Da campanha à execução", body: "Converta uma campanha em tarefas com um clique." },
      { title: "Clientes e equipes", body: "Colaboração transparente." },
    ],
    comunidades: [
      { title: "Gestão de comunidades", body: "Eventos, embaixadores, trilhas e onboarding." },
      { title: "Engajamento", body: "Fórum, WhatsApp e benefícios." },
      { title: "Métodos", body: "NoFunNoGain · CRISC · PARTE." },
    ],
    lekpis: [
      { title: "Indicadores vivos", body: "ROI, CAC, LTV, engajamento, conversão." },
      { title: "Interpretação por IA", body: "A IA lê o gráfico e diz o que fazer." },
      { title: "Plano de ação", body: "Da queda de KPI à campanha corretiva." },
    ],
    ia: [
      { title: "Copiloto contextual", body: "A IA acompanha toda a jornada do usuário." },
      { title: "Memória", body: "Marca, mercado, personas, histórico e conteúdos." },
      { title: "Ações proativas", body: "Detecta oportunidades e sugere próximos passos." },
    ],
    biblioteca: [
      { title: "Repositório único", body: "Personas, estratégias, templates, prompts e cases." },
      { title: "Reutilização", body: "Todo módulo consulta e alimenta a biblioteca." },
      { title: "Governança", body: "Versões, tags e permissões." },
    ],
  };
  return map[slug];
}
