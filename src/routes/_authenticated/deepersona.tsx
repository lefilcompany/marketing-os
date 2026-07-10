import { createFileRoute, Link } from "@tanstack/react-router";
import { getModule } from "@/lib/modules";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import {
  Layers,
  Database,
  TrendingUp,
  Users,
  Target,
  Bot,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/deepersona")({
  head: () => ({ meta: [{ title: "DeePersona — Marketing OS" }] }),
  component: DeePersonaIndex,
});

type Step = {
  n: number;
  key: string;
  title: string;
  desc: string;
  to: string;
  icon: LucideIcon;
  tint: string;
};

const STEPS: Step[] = [
  {
    n: 1,
    key: "csd",
    title: "Alinhamento Inicial",
    desc: "Matriz CSD para alinhar expectativas e definir objetivos.",
    to: "/deepersona/csd",
    icon: Layers,
    tint: "oklch(0.68 0.15 160)",
  },
  {
    n: 2,
    key: "coleta",
    title: "Coleta de Dados",
    desc: "Envie planilhas, CSVs e arquivos para preparar a análise.",
    to: "/deepersona/coleta",
    icon: Database,
    tint: "oklch(0.66 0.2 25)",
  },
  {
    n: 3,
    key: "segmentacao",
    title: "Segmentação",
    desc: "Análise de clusters e identificação de padrões.",
    to: "/deepersona/segmentacao",
    icon: TrendingUp,
    tint: "oklch(0.78 0.15 80)",
  },
  {
    n: 4,
    key: "personas",
    title: "Criação de Personas",
    desc: "Canvas detalhado com características e comportamentos.",
    to: "/deepersona/segmentacao",
    icon: Users,
    tint: "oklch(0.72 0.14 180)",
  },
  {
    n: 5,
    key: "priorizacao",
    title: "Priorização",
    desc: "Matriz de importância × urgência para definir o foco.",
    to: "/deepersona/priorizacao",
    icon: Target,
    tint: "oklch(0.65 0.2 15)",
  },
  {
    n: 6,
    key: "agentes",
    title: "Agentes IA",
    desc: "Converse com as personas criadas em chats guiados por IA.",
    to: "/deepersona/agentes",
    icon: Bot,
    tint: "oklch(0.72 0.16 280)",
  },
];

function DeePersonaIndex() {
  const mod = getModule("deepersona")!;
  return (
    <>
      <ModulePlatformShell module={mod} hideMcpPanel />
      <section className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Fluxo de uso
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Do alinhamento inicial ao chat com suas personas
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Seis etapas guiadas — siga na ordem para construir personas vivas
            baseadas em dados reais e conversar com elas ao final.
          </p>
        </header>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.key}>
                <Link
                  to={s.to}
                  className="group surface-card relative flex h-full flex-col gap-3 overflow-hidden p-5 transition hover:border-white/25 hover:shadow-elevated"
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 blur-2xl"
                    style={{
                      background: `radial-gradient(60% 100% at 20% 0%, ${s.tint}, transparent 70%)`,
                    }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-xl border border-white/15"
                      style={{
                        background: `color-mix(in oklab, ${s.tint} 30%, transparent)`,
                      }}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                      Etapa {String(s.n).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="relative space-y-1">
                    <h3 className="font-display text-lg font-semibold">
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                  <div className="relative mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-foreground/80 group-hover:text-foreground">
                    {i === STEPS.length - 1 ? "Abrir chats" : "Começar"}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
