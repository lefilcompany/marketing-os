import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getModule } from "@/lib/modules";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { useWorkspace } from "@/lib/workspace-context";
import { listPersonas } from "@/lib/personas.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StepShell } from "@/components/deepersona/step-shell";
import { StepCsd } from "@/components/deepersona/step-csd";
import { StepColeta } from "@/components/deepersona/step-coleta";
import { StepSegmentacao } from "@/components/deepersona/step-segmentacao";
import { StepPersonas } from "@/components/deepersona/step-personas";
import { StepPriorizacao } from "@/components/deepersona/step-priorizacao";
import { StepAgentes } from "@/components/deepersona/step-agentes";
import {
  Layers, Database, TrendingUp, Users, Target, Bot,
  ChevronLeft, ChevronRight, Check, Lock, UserCircle2, Sparkles, RotateCcw,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/deepersona/")({
  head: () => ({ meta: [{ title: "DeePersona — Wizard" }] }),
  component: DeePersonaWizard,
});

type StepDef = {
  n: number;
  key: string;
  title: string;
  eyebrow: string;
  description: string;
  icpLine: string;
  icon: LucideIcon;
  tint: string;
};

const STEPS: StepDef[] = [
  {
    n: 1, key: "csd",
    title: "Alinhamento inicial",
    eyebrow: "Matriz CSD",
    description: "Separe Certezas, Suposições e Dúvidas sobre o público. É a base honesta que evita construir personas em cima de achismo.",
    icpLine: "Ancore Certezas / Suposições / Dúvidas no ICP da persona ativa — cada item passa a ser um pedaço testável do ICP.",
    icon: Layers,
    tint: "oklch(0.68 0.15 160)",
  },
  {
    n: 2, key: "coleta",
    title: "Coleta de dados",
    eyebrow: "Fontes & pesquisa",
    description: "Reúna entrevistas, planilhas, analytics e desk research. Cada fonte pode validar uma suposição do CSD.",
    icpLine: "Filtre a coleta pelo segmento, geografia e decisores descritos no ICP para não misturar públicos distintos.",
    icon: Database,
    tint: "oklch(0.66 0.2 25)",
  },
  {
    n: 3, key: "segmentacao",
    title: "Segmentação",
    eyebrow: "Clusters",
    description: "Agrupe padrões da coleta em clusters distintos. Cada cluster vira uma persona no próximo passo.",
    icpLine: "Os clusters são ranqueados por aderência ao ICP — quanto mais próximos, mais alta a prioridade sugerida.",
    icon: TrendingUp,
    tint: "oklch(0.78 0.15 80)",
  },
  {
    n: 4, key: "personas",
    title: "Criação de personas",
    eyebrow: "Canvas",
    description: "Cada persona ganha um canvas detalhado com dores, objetivos e comportamento. A IA parte do cluster e do ICP.",
    icpLine: "O canvas herda gatilhos e critérios de decisão do ICP, garantindo consistência entre estratégia e discurso.",
    icon: Users,
    tint: "oklch(0.72 0.14 180)",
  },
  {
    n: 5, key: "priorizacao",
    title: "Priorização",
    eyebrow: "Importância × Urgência",
    description: "Classifique cada persona por valor estratégico × timing para decidir onde investir agora.",
    icpLine: "O peso da urgência é calibrado pelos triggers do ICP — quem está no momento certo entra em 'Focar agora'.",
    icon: Target,
    tint: "oklch(0.65 0.2 15)",
  },
  {
    n: 6, key: "agentes",
    title: "Agentes IA",
    eyebrow: "Chat com personas",
    description: "Converse com as personas criadas: teste mensagens, valide hipóteses, entreviste em tempo real.",
    icpLine: "O agente responde em primeira pessoa como o ICP escolhido, com tom, dores e objeções do canvas.",
    icon: Bot,
    tint: "oklch(0.72 0.16 280)",
  },
];

const ACTIVE_KEY = "deepersona:active-persona";
const flowKey = (personaId: string | null) =>
  `deepersona:flow:${personaId ?? "global"}`;

type FlowState = { currentStep: number; completed: number[] };

function readFlow(personaId: string | null): FlowState {
  if (typeof window === "undefined") return { currentStep: 0, completed: [] };
  try {
    const raw = window.localStorage.getItem(flowKey(personaId));
    if (!raw) return { currentStep: 0, completed: [] };
    const parsed = JSON.parse(raw) as FlowState;
    return {
      currentStep: Math.max(0, Math.min(STEPS.length - 1, Number(parsed.currentStep) || 0)),
      completed: Array.isArray(parsed.completed) ? parsed.completed.map(Number).filter((n) => n >= 0 && n < STEPS.length) : [],
    };
  } catch {
    return { currentStep: 0, completed: [] };
  }
}

function writeFlow(personaId: string | null, s: FlowState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(flowKey(personaId), JSON.stringify(s)); } catch { /* noop */ }
}

type PersonaLite = {
  id: string;
  name: string;
  role: string | null;
  stage: string | null;
  icp: Record<string, unknown> | null;
};

function DeePersonaWizard() {
  const mod = getModule("deepersona")!;
  const { currentOrgId } = useWorkspace();

  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveId(window.localStorage.getItem(ACTIVE_KEY));
  }, []);

  const personasQ = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const personas = (personasQ.data?.items ?? []) as PersonaLite[];
  const active = (activeId && personas.find((p) => p.id === activeId)) || personas[0] || null;
  const activePersonaId = active?.id ?? null;

  useEffect(() => {
    if (typeof window === "undefined" || !active) return;
    if (active.id !== activeId) window.localStorage.setItem(ACTIVE_KEY, active.id);
  }, [active, activeId]);

  // Flow state por persona ativa (ou "global" quando ainda não há persona).
  const [flow, setFlow] = useState<FlowState>({ currentStep: 0, completed: [] });
  useEffect(() => {
    setFlow(readFlow(activePersonaId));
  }, [activePersonaId]);
  useEffect(() => {
    writeFlow(activePersonaId, flow);
  }, [flow, activePersonaId]);

  const currentIdx = flow.currentStep;
  const currentStep = STEPS[currentIdx];
  const isCurrentDone = flow.completed.includes(currentIdx);
  const isLast = currentIdx === STEPS.length - 1;
  const allDone = flow.completed.length === STEPS.length;

  const markComplete = useCallback((idx: number) => {
    setFlow((f) => (f.completed.includes(idx) ? f : { ...f, completed: [...f.completed, idx].sort((a, b) => a - b) }));
  }, []);
  const goTo = useCallback((idx: number) => {
    setFlow((f) => ({ ...f, currentStep: Math.max(0, Math.min(STEPS.length - 1, idx)) }));
  }, []);

  const onSelectPersona = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const icp = (active?.icp ?? {}) as Record<string, unknown>;
  const icpChips = useMemo(
    () => [
      { label: "Segmento", value: icp.segment as string | undefined },
      { label: "Empresa", value: icp.company_size as string | undefined },
      { label: "Geografia", value: icp.geography as string | undefined },
      { label: "Orçamento", value: icp.budget_range as string | undefined },
    ].filter((c) => c.value),
    [icp],
  );

  const progressPct = ((currentIdx + 1) / STEPS.length) * 100;

  const restart = () => {
    setFlow({ currentStep: 0, completed: [] });
  };

  return (
    <>
      <ModulePlatformShell module={mod} hideMcpPanel />

      {/* Header do ICP ativo */}
      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div
          className="surface-card relative overflow-hidden p-5"
          style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 18%, transparent), transparent 70%)` }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15"
                style={{ background: `color-mix(in oklab, ${mod.color} 25%, transparent)` }}>
                <UserCircle2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ICP ativo</p>
                <h2 className="font-display text-xl font-semibold tracking-tight mt-0.5">
                  {active
                    ? active.name
                    : personas.length === 0
                      ? "Nenhuma persona criada ainda"
                      : "Selecione uma persona"}
                </h2>
                {active?.role && <p className="text-sm text-muted-foreground">{active.role}</p>}
                {icpChips.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {icpChips.map((c) => (
                      <li key={c.label}>
                        <Badge variant="secondary" className="text-[10px] font-normal bg-white/8 border-white/10">
                          <span className="text-muted-foreground mr-1">{c.label}:</span>
                          {c.value}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {!active && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Comece pela etapa 1 — o ICP será construído durante o fluxo e aparecerá aqui.
                  </p>
                )}
              </div>
            </div>

            {personas.length > 0 && (
              <div className="w-full md:w-72 shrink-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1.5">Trocar persona</p>
                <Select value={active?.id ?? undefined} onValueChange={onSelectPersona}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.role ? <span className="text-muted-foreground"> · {p.role}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stepper */}
      <section className="mx-auto max-w-5xl px-6 pt-6">
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Fluxo guiado</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Etapa <span className="text-foreground font-semibold">{currentIdx + 1}</span> de {STEPS.length}
              {flow.completed.length > 0 && (
                <span className="ml-2 text-muted-foreground">· {flow.completed.length} concluída{flow.completed.length === 1 ? "" : "s"}</span>
              )}
            </p>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${currentStep.tint}, color-mix(in oklab, ${currentStep.tint} 55%, white))` }} />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {STEPS.map((s, i) => {
              const done = flow.completed.includes(i);
              const isActive = i === currentIdx;
              const maxUnlocked = Math.max(currentIdx, ...flow.completed, 0);
              const unlocked = i <= maxUnlocked + 1;
              const canClick = unlocked;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => canClick && goTo(i)}
                  disabled={!canClick}
                  className={`group shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-[11px] font-medium transition-all border ${
                    isActive
                      ? "bg-white/10 text-foreground border-white/20 ring-1"
                      : done
                        ? "bg-white/5 text-foreground/85 border-white/10 hover:bg-white/10"
                        : canClick
                          ? "bg-transparent text-muted-foreground border-white/8 hover:bg-white/5 hover:text-foreground"
                          : "bg-transparent text-muted-foreground/50 border-white/5 cursor-not-allowed"
                  }`}
                  style={isActive ? ({ ["--tw-ring-color" as never]: s.tint } as Record<string, string>) : undefined}
                >
                  <span
                    className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold shrink-0"
                    style={{
                      background: done || isActive ? s.tint : "transparent",
                      color: done || isActive ? "white" : "var(--muted-foreground)",
                      border: done || isActive ? "none" : "1px solid var(--border)",
                    }}
                  >
                    {done ? <Check className="h-3 w-3" strokeWidth={3} /> : canClick ? i + 1 : <Lock className="h-2.5 w-2.5" />}
                  </span>
                  <span className="whitespace-nowrap">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Painel da etapa */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        {allDone ? (
          <div className="surface-card p-8 space-y-5 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40"
              style={{ background: `radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, ${mod.color} 30%, transparent), transparent 70%)` }} />
            <div className="relative">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/15 mb-4"
                style={{ background: `color-mix(in oklab, ${mod.color} 30%, transparent)` }}>
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h2 className="font-display text-2xl font-semibold">Fluxo concluído</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mt-2">
                Você percorreu todas as etapas do DeePersona.{" "}
                {active ? `A persona "${active.name}" está pronta para uso.` : ""}
              </p>
              <div className="flex items-center justify-center gap-2 mt-5">
                <Button variant="ghost" onClick={restart} className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Recomeçar
                </Button>
                <Button onClick={() => goTo(STEPS.length - 1)} className="gap-2">
                  <Bot className="h-4 w-4" /> Abrir agentes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <StepShell
            key={currentStep.key}
            step={currentStep.n}
            total={STEPS.length}
            eyebrow={currentStep.eyebrow}
            title={currentStep.title}
            description={currentStep.description}
            icon={currentStep.icon}
            tint={currentStep.tint}
            icpLine={currentStep.icpLine}
            personaName={active?.name ?? null}
            completed={isCurrentDone}
            onMarkComplete={() => markComplete(currentIdx)}
          >
            {currentIdx === 0 && <StepCsd onAutoComplete={() => markComplete(0)} />}
            {currentIdx === 1 && <StepColeta onAutoComplete={() => markComplete(1)} />}
            {currentIdx === 2 && <StepSegmentacao onAutoComplete={() => markComplete(2)} />}
            {currentIdx === 3 && (
              <StepPersonas onAutoComplete={() => markComplete(3)} onSelectPersona={onSelectPersona} />
            )}
            {currentIdx === 4 && <StepPriorizacao onAutoComplete={() => markComplete(4)} />}
            {currentIdx === 5 && <StepAgentes moduleColor={mod.color} onAutoComplete={() => markComplete(5)} />}
          </StepShell>
        )}
      </section>

      {/* Footer nav */}
      {!allDone && (
        <div className="sticky bottom-0 border-t border-white/10 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => goTo(currentIdx - 1)}
              disabled={currentIdx === 0}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              {isCurrentDone
                ? "Etapa concluída — pode avançar."
                : "Complete a etapa atual para desbloquear a próxima."}
            </p>
            <Button
              onClick={() => {
                if (isLast) markComplete(currentIdx);
                else goTo(currentIdx + 1);
              }}
              disabled={!isCurrentDone}
              className="gap-1.5"
              style={
                isCurrentDone
                  ? { background: `linear-gradient(135deg, ${currentStep.tint}, color-mix(in oklab, ${currentStep.tint} 70%, black))` }
                  : undefined
              }
            >
              {isLast ? "Finalizar" : "Avançar"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
