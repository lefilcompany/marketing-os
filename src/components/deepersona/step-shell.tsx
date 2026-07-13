import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  step: number;
  total: number;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tint: string;
  icpLine: string;
  personaName?: string | null;
  completed: boolean;
  onMarkComplete: () => void;
  children: ReactNode;
};

/**
 * Wrapper visual comum a todas as etapas do wizard DeePersona.
 * Título/eyebrow/ícone + faixa "Conexão com o ICP" + slot de conteúdo +
 * botão manual "Marcar etapa como concluída" (fallback caso a detecção
 * automática não pegue o estado por qualquer motivo).
 */
export function StepShell({
  step,
  total,
  eyebrow,
  title,
  description,
  icon: Icon,
  tint,
  icpLine,
  personaName,
  completed,
  onMarkComplete,
  children,
}: Props) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/20 shadow-elevated"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${tint} 55%, transparent), color-mix(in oklab, ${tint} 20%, transparent))`,
          }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Etapa {String(step).padStart(2, "0")} de {String(total).padStart(2, "0")} · {eyebrow}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>
        </div>
      </header>

      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-4"
        style={{
          background: `linear-gradient(120deg, color-mix(in oklab, ${tint} 12%, transparent), transparent 70%)`,
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Conexão com o ICP
        </p>
        <p className="text-sm text-foreground/85 mt-1">{icpLine}</p>
        {personaName && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Persona ativa: <span className="text-foreground/80">{personaName}</span>
          </p>
        )}
      </div>

      <div>{children}</div>

      {!completed && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Já cumpriu esta etapa? Marque como concluída para liberar a próxima.
          </p>
          <button
            type="button"
            onClick={onMarkComplete}
            className="text-xs font-medium text-foreground/80 hover:text-foreground underline underline-offset-4"
          >
            Marcar como concluída
          </button>
        </div>
      )}
    </div>
  );
}
