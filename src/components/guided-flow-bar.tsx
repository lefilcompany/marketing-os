import { useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { FLOWS, getFlow } from "@/lib/flows";
import { getModule } from "@/lib/modules";
import { ChevronLeft, ChevronRight, X, Route as RouteIcon } from "lucide-react";

/**
 * Barra persistente do "modo guiado".
 * Ativa quando a URL contém `?flow=<id>&step=<index>`.
 * Fica sticky abaixo do header enquanto o usuário navega entre módulos.
 */
export function GuidedFlowBar() {
  const nav = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchRaw = useRouterState({ select: (s) => s.location.search });
  const search = searchRaw as unknown as Record<string, unknown> | undefined;

  const params = useMemo(() => {
    const flowId =
      typeof search?.flow === "string" || typeof search?.flow === "number"
        ? String(search.flow)
        : null;
    const rawStep = search?.step;
    const stepIdx =
      typeof rawStep === "number"
        ? rawStep
        : typeof rawStep === "string"
          ? parseInt(rawStep, 10) || 0
          : 0;
    return { flowId, stepIdx: Math.max(0, stepIdx) };
  }, [search]);

  const flow = getFlow(params.flowId);
  if (!flow) return null;

  const stepIdx = Math.min(params.stepIdx, flow.steps.length - 1);
  const step = flow.steps[stepIdx];
  const mod = getModule(step.module);
  const total = flow.steps.length;
  const progress = ((stepIdx + 1) / total) * 100;

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, total - 1));
    const s = flow.steps[clamped];
    const m = getModule(s.module);
    const target = s.to ?? m?.route ?? "/dashboard";
    nav({ to: target, search: { flow: flow.id, step: clamped } as never });
  };

  const exit = () => {
    nav({ to: pathname, search: {} as never, replace: true });
  };

  return (
    <div className="sticky top-14 z-20 border-b border-border/60 bg-[#0F172A] text-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-2.5 flex items-center gap-4">
        {/* Identidade do fluxo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white font-semibold text-xs">
            {flow.number}
          </div>
          <div className="hidden sm:block">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-semibold flex items-center gap-1.5">
              <RouteIcon className="h-3 w-3" />
              Fluxo ativo
            </div>
            <div className="text-[12px] font-medium leading-tight">
              {flow.title}
            </div>
          </div>
        </div>

        {/* Steps clicáveis */}
        <div className="flex-1 min-w-0 hidden md:flex items-center gap-1.5 overflow-x-auto">
          {flow.steps.map((s, i) => {
            const m = getModule(s.module);
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <button
                key={s.key}
                onClick={() => goTo(i)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "bg-white text-[#0F172A]"
                    : done
                      ? "text-white/80 hover:bg-white/10"
                      : "text-white/50 hover:bg-white/10"
                }`}
                title={s.label}
              >
                <span
                  className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold"
                  style={{
                    background: active
                      ? m?.color ?? "var(--primary)"
                      : "transparent",
                    border: active ? "none" : `1px solid ${done ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}`,
                    color: active ? "white" : undefined,
                  }}
                >
                  {i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Estado + navegação */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <div className="hidden lg:flex items-center gap-2">
            <div className="text-[11px] text-white/60 tabular-nums">
              Etapa {stepIdx + 1} de {total}
            </div>
            <div className="h-1 w-20 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => goTo(stepIdx - 1)}
            disabled={stepIdx === 0}
            className="h-7 w-7 grid place-items-center rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Etapa anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => goTo(stepIdx + 1)}
            disabled={stepIdx === total - 1}
            className="h-7 px-3 flex items-center gap-1 rounded-lg bg-primary text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={exit}
            className="h-7 w-7 grid place-items-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition"
            aria-label="Sair do fluxo"
            title="Sair do fluxo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Contexto atual do módulo (barra fininha inferior) */}
      {mod && (
        <div
          className="h-[2px] w-full"
          style={{ background: `linear-gradient(90deg, ${mod.color}, transparent)` }}
        />
      )}
    </div>
  );
}
