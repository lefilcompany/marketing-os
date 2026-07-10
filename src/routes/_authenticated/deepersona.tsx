import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getModule } from "@/lib/modules";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { useWorkspace } from "@/lib/workspace-context";
import { listPersonas } from "@/lib/personas.functions";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  Database,
  TrendingUp,
  Users,
  Target,
  Bot,
  ArrowRight,
  UserCircle2,
  Sparkles,
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
  icpLine: string;
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
    icpLine: "Ancore Certezas / Suposições / Dúvidas no ICP da persona.",
    to: "/deepersona/csd",
    icon: Layers,
    tint: "oklch(0.68 0.15 160)",
  },
  {
    n: 2,
    key: "coleta",
    title: "Coleta de Dados",
    desc: "Envie planilhas, CSVs e arquivos para preparar a análise.",
    icpLine: "Filtre a coleta pelo segmento, geografia e decisores do ICP.",
    to: "/deepersona/coleta",
    icon: Database,
    tint: "oklch(0.66 0.2 25)",
  },
  {
    n: 3,
    key: "segmentacao",
    title: "Segmentação",
    desc: "Análise de clusters e identificação de padrões.",
    icpLine: "Clusters ranqueados por aderência ao ICP ativo.",
    to: "/deepersona/segmentacao",
    icon: TrendingUp,
    tint: "oklch(0.78 0.15 80)",
  },
  {
    n: 4,
    key: "personas",
    title: "Criação de Personas",
    desc: "Canvas detalhado com características e comportamentos.",
    icpLine: "Canvas herda gatilhos e critérios de decisão do ICP.",
    to: "/deepersona/segmentacao",
    icon: Users,
    tint: "oklch(0.72 0.14 180)",
  },
  {
    n: 5,
    key: "priorizacao",
    title: "Priorização",
    desc: "Matriz de importância × urgência para definir o foco.",
    icpLine: "Peso da urgência calibrado pelos triggers do ICP.",
    to: "/deepersona/priorizacao",
    icon: Target,
    tint: "oklch(0.65 0.2 15)",
  },
  {
    n: 6,
    key: "agentes",
    title: "Agentes IA",
    desc: "Converse com as personas criadas em chats guiados por IA.",
    icpLine: "Agente responde em 1ª pessoa como o ICP escolhido.",
    to: "/deepersona/agentes",
    icon: Bot,
    tint: "oklch(0.72 0.16 280)",
  },
];

const STORAGE_KEY = "deepersona:active-persona";

type PersonaLite = {
  id: string;
  name: string;
  role: string | null;
  stage: string | null;
  icp: Record<string, unknown> | null;
};

function DeePersonaIndex() {
  const mod = getModule("deepersona")!;
  const { currentOrgId } = useWorkspace();

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const personasQ = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const personas = ((personasQ.data?.items ?? []) as PersonaLite[]);
  const active =
    (activeId && personas.find((p) => p.id === activeId)) ||
    personas[0] ||
    null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (active?.id && active.id !== activeId) {
      window.localStorage.setItem(STORAGE_KEY, active.id);
    }
  }, [active?.id, activeId]);

  function onPick(id: string) {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }

  const icp = (active?.icp ?? {}) as Record<string, unknown>;
  const icpChips = [
    { label: "Segmento", value: icp.segment as string | undefined },
    { label: "Empresa", value: icp.company_size as string | undefined },
    { label: "Geografia", value: icp.geography as string | undefined },
    { label: "Orçamento", value: icp.budget_range as string | undefined },
  ].filter((c) => c.value);

  // O ID da persona ativa fica em localStorage (STORAGE_KEY); as sub-rotas leem
  // de lá — evita depender de search params tipados em cada rota.

  return (
    <>
      <ModulePlatformShell module={mod} hideMcpPanel />

      <section className="mx-auto max-w-6xl px-6 pt-8 pb-4">
        <div
          className="surface-card relative overflow-hidden p-5"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 18%, transparent), transparent 70%)`,
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15"
                style={{ background: `color-mix(in oklab, ${mod.color} 25%, transparent)` }}
              >
                <UserCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  ICP ativo
                </p>
                <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
                  {active
                    ? active.name
                    : personas.length === 0
                      ? "Nenhuma persona criada ainda"
                      : "Selecione uma persona"}
                </h2>
                {active?.role && (
                  <p className="text-sm text-muted-foreground">{active.role}</p>
                )}
                {icpChips.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {icpChips.map((c) => (
                      <li key={c.label}>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal bg-white/8 border-white/10"
                        >
                          <span className="text-muted-foreground mr-1">
                            {c.label}:
                          </span>
                          {c.value}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {active && icpChips.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Esta persona ainda não tem ICP definido. Gere o ICP na etapa
                    de criação para que ele guie o fluxo.
                  </p>
                )}
              </div>
            </div>

            {personas.length > 0 ? (
              <div className="w-full md:w-72 shrink-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">
                  Trocar persona
                </p>
                <Select
                  value={active?.id ?? undefined}
                  onValueChange={onPick}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.role ? (
                          <span className="text-muted-foreground"> · {p.role}</span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {active && (
                  <Link
                    to="/deepersona/$id"
                    params={{ id: active.id }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3" />
                    Abrir canvas completo
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground md:max-w-xs">
                Comece pela etapa 1 — o ICP será construído ao longo do fluxo e
                aparecerá aqui para guiar as próximas etapas.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10 space-y-6">
        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Fluxo de uso
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Do alinhamento inicial ao chat com suas personas
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Cada etapa é executada sobre o ICP da persona selecionada acima —
            trocar a persona reajusta todo o fluxo.
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
                  <div className="relative rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Conexão com o ICP
                    </p>
                    <p className="text-xs text-foreground/85 mt-0.5">
                      {s.icpLine}
                    </p>
                    {active && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        Persona: <span className="text-foreground/80">{active.name}</span>
                      </p>
                    )}
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
