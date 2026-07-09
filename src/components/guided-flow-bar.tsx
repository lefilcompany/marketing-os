import { useEffect, useMemo, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { getFlow, type FlowDef } from "@/lib/flows";
import { getModule } from "@/lib/modules";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Route as RouteIcon,
  Sparkles,
  X,
} from "lucide-react";

const STORAGE_KEY = "guided-flow:v1";

type PersistedFlow = { flowId: string; stepIdx: number };

function readPersisted(): PersistedFlow | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFlow;
    if (!parsed?.flowId) return null;
    return { flowId: String(parsed.flowId), stepIdx: Math.max(0, Number(parsed.stepIdx) || 0) };
  } catch {
    return null;
  }
}

function writePersisted(p: PersistedFlow | null) {
  if (typeof window === "undefined") return;
  try {
    if (!p) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

/**
 * Barra persistente do "modo guiado".
 * Ativada por `?flow=<id>&step=<index>` na URL — a partir daí a preferência
 * fica salva em localStorage, então a barra continua visível mesmo quando o
 * usuário abre uma persona, tarefa ou detalhe interno que não carrega os
 * search params. Só desaparece quando o usuário clica em "Sair do fluxo".
 */
export function GuidedFlowBar() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchRaw = useRouterState({ select: (s) => s.location.search });
  const search = searchRaw as unknown as Record<string, unknown> | undefined;

  const urlFlow = useMemo<PersistedFlow | null>(() => {
    const flowId =
      typeof search?.flow === "string" || typeof search?.flow === "number"
        ? String(search.flow)
        : null;
    if (!flowId) return null;
    const rawStep = search?.step;
    const stepIdx =
      typeof rawStep === "number"
        ? rawStep
        : typeof rawStep === "string"
          ? parseInt(rawStep, 10) || 0
          : 0;
    return { flowId, stepIdx: Math.max(0, stepIdx) };
  }, [search]);

  // Estado ativo: URL manda; fallback = localStorage.
  const [active, setActive] = useState<PersistedFlow | null>(() => readPersisted());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (urlFlow) {
      writePersisted(urlFlow);
      setActive(urlFlow);
    }
  }, [urlFlow]);

  const flow: FlowDef | undefined = getFlow(active?.flowId);
  if (!active || !flow) return null;

  const stepIdx = Math.min(Math.max(0, active.stepIdx), flow.steps.length - 1);
  const currentStep = flow.steps[stepIdx];
  const currentMod = getModule(currentStep.module);
  const total = flow.steps.length;
  const progress = ((stepIdx + 1) / total) * 100;
  const moduleColor = currentMod?.color ?? "var(--primary)";

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, total - 1));
    const s = flow.steps[clamped];
    const m = getModule(s.module);
    const target = s.to ?? m?.route ?? "/dashboard";
    const next: PersistedFlow = { flowId: flow.id, stepIdx: clamped };
    writePersisted(next);
    setActive(next);
    nav({ to: target, search: { flow: flow.id, step: clamped } as never });
  };

  const exit = () => {
    writePersisted(null);
    setActive(null);
    nav({ to: pathname, search: {} as never, replace: true });
  };

  if (collapsed) {
    return (
      <div className="sticky top-14 z-20 flex justify-center pointer-events-none">
        <button
          onClick={() => setCollapsed(false)}
          className="pointer-events-auto mt-2 flex items-center gap-2 rounded-full border border-border/60 bg-white/95 backdrop-blur-xl px-3.5 py-1.5 text-[11px] font-medium text-foreground shadow-lg hover:shadow-xl transition-all"
        >
          <span
            className="grid h-5 w-5 place-items-center rounded-full text-white text-[10px] font-bold"
            style={{ background: moduleColor }}
          >
            {flow.number}
          </span>
          <span className="text-muted-foreground">Fluxo {flow.number}</span>
          <span className="font-semibold">
            {stepIdx + 1}/{total}
          </span>
          <span className="hidden sm:inline text-foreground/80">· {currentStep.label}</span>
          <ChevronRight className="h-3 w-3 opacity-60" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="sticky top-14 z-20 border-b border-border/60 bg-white/85 backdrop-blur-xl"
      style={{
        backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${moduleColor} 7%, transparent) 0%, transparent 60%)`,
      }}
    >
      {/* Linha superior: identidade + navegação + progresso */}
      <div className="mx-auto max-w-7xl px-4 lg:px-6 pt-3 pb-2 flex items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="grid h-9 w-9 place-items-center rounded-xl text-white font-bold text-sm shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${moduleColor}, color-mix(in oklab, ${moduleColor} 60%, black))`,
            }}
          >
            {flow.number}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground font-semibold flex items-center gap-1.5">
              <RouteIcon className="h-3 w-3" />
              Fluxo ativo · {flow.eyebrow}
            </div>
            <div className="text-[13px] font-semibold text-foreground leading-tight truncate">
              {flow.title}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 min-w-0 items-center gap-3 px-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${moduleColor}, color-mix(in oklab, ${moduleColor} 55%, white))`,
              }}
            />
          </div>
          <div className="text-[11px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
            Etapa <span className="text-foreground font-semibold">{stepIdx + 1}</span> de {total}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button
            onClick={() => goTo(stepIdx - 1)}
            disabled={stepIdx === 0}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            aria-label="Etapa anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => goTo(stepIdx + 1)}
            disabled={stepIdx === total - 1}
            className="h-8 px-3.5 flex items-center gap-1.5 rounded-lg text-white text-[12px] font-semibold shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition"
            style={{
              background: `linear-gradient(135deg, ${moduleColor}, color-mix(in oklab, ${moduleColor} 70%, black))`,
            }}
          >
            {stepIdx === total - 1 ? (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Concluir
              </>
            ) : (
              <>
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Minimizar barra do fluxo"
            title="Minimizar"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={exit}
            className="h-8 w-8 grid place-items-center rounded-lg border border-border bg-white text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition"
            aria-label="Sair do fluxo"
            title="Sair do fluxo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Trilho de etapas */}
      <div className="mx-auto max-w-7xl px-4 lg:px-6 pb-3">
        <div className="relative flex items-center gap-1 overflow-x-auto scrollbar-none">
          {flow.steps.map((s, i) => {
            const m = getModule(s.module);
            const active = i === stepIdx;
            const done = i < stepIdx;
            const c = m?.color ?? "var(--primary)";
            return (
              <button
                key={s.key}
                onClick={() => goTo(i)}
                className={`group shrink-0 flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 text-[11px] font-medium transition-all border ${
                  active
                    ? "bg-white text-foreground border-transparent shadow-sm ring-1"
                    : done
                      ? "bg-white/70 text-foreground/80 border-border hover:bg-white"
                      : "bg-transparent text-muted-foreground border-border/60 hover:bg-white hover:text-foreground"
                }`}
                style={active ? ({ ["--tw-ring-color" as never]: c } as Record<string, string>) : undefined}
                title={s.label}
              >
                <span
                  className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold shrink-0"
                  style={{
                    background: active || done ? c : "transparent",
                    color: active || done ? "white" : "var(--muted-foreground)",
                    border: active || done ? "none" : "1px solid var(--border)",
                  }}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
                {i < total - 1 && (
                  <span
                    className="ml-1 h-px w-3 shrink-0"
                    style={{
                      background: done ? c : "var(--border)",
                      opacity: done ? 0.6 : 1,
                    }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
