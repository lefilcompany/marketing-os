import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { seedTemplateKpis } from "@/lib/kpis.functions";
import type { DashboardTemplate } from "@/lib/dashboard-templates";

type Props = {
  template: DashboardTemplate;
  orgId: string | null | undefined;
  /** Chaves de métricas já existentes no workspace, para calcular o diff. */
  existingKeys: Set<string>;
  loadingExisting?: boolean;
  size?: "sm" | "default";
  variant?: "secondary" | "default" | "ghost";
  className?: string;
  /** Chaves de queries adicionais para invalidar após o sucesso. */
  invalidateKeys?: readonly (readonly unknown[])[];
};

export function SeedTemplateButton({
  template,
  orgId,
  existingKeys,
  loadingExisting = false,
  size = "default",
  variant = "secondary",
  className,
  invalidateKeys,
}: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { toInsert, alreadyThere } = useMemo(() => {
    const missing = template.metrics.filter((m) => !existingKeys.has(m.key));
    return {
      toInsert: missing,
      alreadyThere: template.metrics.length - missing.length,
    };
  }, [template.metrics, existingKeys]);

  const nothingToDo = !loadingExisting && toInsert.length === 0;

  const seedM = useMutation({
    mutationFn: () =>
      seedTemplateKpis({
        data: {
          organizationId: orgId!,
          module: `template:${template.slug}`,
          metrics: template.metrics.map((m) => ({
            key: m.key,
            label: `${m.label} · ${m.platform}`,
            unit: m.unit,
            target: m.target ?? null,
          })),
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["lekpis"] });
      qc.invalidateQueries({ queryKey: ["lekpis-template-preview"] });
      for (const key of invalidateKeys ?? []) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
      if (res.inserted > 0) {
        toast.success(`${res.inserted} indicador(es) criado(s) em ${template.name}.`, {
          description: "Você já pode atualizar os valores em LeKPIs.",
        });
      } else {
        toast.info("Nada a criar — os indicadores já existem neste workspace.");
      }
      setOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Falha ao aplicar template.", {
        description: "Tente novamente em alguns instantes.",
      }),
  });

  const disabled = !orgId || seedM.isPending;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled || nothingToDo}
        className={className}
        title={
          !orgId
            ? "Selecione um workspace"
            : nothingToDo
            ? "Todos os indicadores já existem neste workspace"
            : undefined
        }
      >
        {seedM.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : nothingToDo ? (
          <Check className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {seedM.isPending
          ? "Aplicando…"
          : nothingToDo
          ? "Já semeado"
          : size === "sm"
          ? "Semear"
          : "Aplicar template"}
      </Button>

      <AlertDialog open={open} onOpenChange={(v) => (!seedM.isPending ? setOpen(v) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Semear template “{template.name}”?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Serão criados <strong>{toInsert.length}</strong> indicador(es) neste workspace.
                  {alreadyThere > 0 && (
                    <>
                      {" "}
                      <span className="text-muted-foreground">
                        ({alreadyThere} já existem e serão preservados.)
                      </span>
                    </>
                  )}
                </p>

                {toInsert.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 max-h-48 overflow-auto">
                    <ul className="space-y-1.5">
                      {toInsert.slice(0, 12).map((m) => (
                        <li key={m.key} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate">
                            <span className="font-medium">{m.label}</span>
                            <span className="text-muted-foreground"> · {m.platform}</span>
                          </span>
                          {m.target != null && (
                            <span className="text-muted-foreground text-[10px] shrink-0">
                              meta {m.target}
                              {m.unit ? ` ${m.unit}` : ""}
                            </span>
                          )}
                        </li>
                      ))}
                      {toInsert.length > 12 && (
                        <li className="text-[11px] text-muted-foreground pt-1">
                          + {toInsert.length - 12} outro(s)…
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Indicadores existentes não serão duplicados nem sobrescritos. Você pode aplicar
                    este template mais de uma vez com segurança.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={seedM.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                seedM.mutate();
              }}
              disabled={seedM.isPending || toInsert.length === 0}
            >
              {seedM.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Aplicando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Confirmar e semear
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
