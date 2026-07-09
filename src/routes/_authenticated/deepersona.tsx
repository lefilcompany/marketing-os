import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getModule } from "@/lib/modules";
import { useWorkspace } from "@/lib/workspace-context";
import {
  listPersonas,
  createPersona,
  deletePersona,
  generatePersonaBase,
} from "@/lib/personas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Plus,
  Sparkles,
  Trash2,
  ArrowUpRight,
  Loader2,
  Target,
  Database,
  TrendingUp,
  Brain,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const METHODOLOGY: Array<{
  step: string;
  title: string;
  description: string;
  icon: typeof Layers;
  to?: string;
  status: "active" | "soon";
}> = [
  {
    step: "01",
    title: "Alinhamento inicial",
    description: "Matriz CSD — Certezas, Suposições e Dúvidas sobre o público.",
    icon: Layers,
    to: "/deepersona/csd",
    status: "active",
  },
  {
    step: "02",
    title: "Coleta de dados",
    description: "Entrevistas, pesquisas e analytics vinculados ao CSD.",
    icon: Database,
    to: "/deepersona/coleta",
    status: "active",
  },
  {
    step: "03",
    title: "Segmentação",
    description: "Clusters gerados pela IA a partir do CSD + coleta.",
    icon: TrendingUp,
    to: "/deepersona/segmentacao",
    status: "active",
  },
  {
    step: "04",
    title: "Criação de personas",
    description: "Canvas detalhado com JTBD, motivações e objeções.",
    icon: Users,
    status: "active",
  },
  {
    step: "05",
    title: "Priorização",
    description: "Matriz de importância × urgência para definir foco.",
    icon: Target,
    status: "soon",
  },
  {
    step: "06",
    title: "Agentes IA",
    description: "Agentes inteligentes baseados nas personas.",
    icon: Brain,
    status: "soon",
  },
];

const STAGE_LABEL: Record<string, string> = {
  draft: "Rascunho",
  base: "Base",
  icp: "ICP",
  journey: "Jornada",
  insights: "Insights",
  live: "Viva",
};

const STAGE_ORDER = ["draft", "base", "icp", "journey", "insights", "live"];

export const Route = createFileRoute("/_authenticated/deepersona")({
  head: () => ({ meta: [{ title: "DeePersona — Marketing OS" }] }),
  component: DeePersonaIndex,
});

function DeePersonaIndex() {
  const mod = getModule("deepersona")!;
  const Icon = mod.icon;
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [briefing, setBriefing] = useState("");
  const [useAI, setUseAI] = useState(true);

  const create = useMutation({
    mutationFn: async () => {
      const res = await createPersona({
        data: {
          organizationId: currentOrgId!,
          name: name.trim(),
          role: role.trim() || undefined,
          description: briefing.trim() || undefined,
        },
      });
      if (useAI && briefing.trim().length >= 4) {
        await generatePersonaBase({
          data: { id: res.item.id, briefing: briefing.trim() },
        });
      }
      return res.item;
    },
    onSuccess: (persona) => {
      toast.success("Persona criada");
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      qc.invalidateQueries({ queryKey: ["modules-overview", currentOrgId] });
      setOpen(false);
      setName("");
      setRole("");
      setBriefing("");
      navigate({ to: "/deepersona/$id", params: { id: persona.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePersona({ data: { id } }),
    onSuccess: () => {
      toast.success("Persona removida");
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      qc.invalidateQueries({ queryKey: ["modules-overview", currentOrgId] });
    },
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10 opacity-50"
        style={{
          background: `radial-gradient(60% 100% at 20% 0%, color-mix(in oklab, ${mod.color} 30%, transparent), transparent 70%)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex items-start gap-5">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 shadow-elevated"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 55%, transparent), color-mix(in oklab, ${mod.color} 20%, transparent))`,
            }}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Módulo · Marketing OS
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              DeePersona
            </h1>
            <p className="text-muted-foreground mt-1">
              Personas vivas em quatro etapas: Base → ICP → Jornada → Insights.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova persona
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar persona</DialogTitle>
                <DialogDescription>
                  Comece por um nome e um briefing. A IA gera o esqueleto base
                  em seguida.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome da persona</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Marina, gestora de marketing"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Cargo / rótulo (opcional)</Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex.: Head of Growth"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="briefing">Briefing</Label>
                  <Textarea
                    id="briefing"
                    value={briefing}
                    onChange={(e) => setBriefing(e.target.value)}
                    placeholder="Contexto de mercado, segmento, produto, dores conhecidas..."
                    rows={4}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                  />
                  Gerar base com IA a partir do briefing
                </label>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!name.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Metodologia — 6 etapas */}
        <section className="surface-card relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(80% 60% at 100% 0%, color-mix(in oklab, ${mod.color} 25%, transparent), transparent 70%)`,
            }}
          />
          <div className="relative p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Metodologia
                </p>
                <h2 className="font-display text-xl font-semibold mt-1">
                  Do alinhamento à persona viva, em 6 etapas
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Comece pela Matriz CSD para separar o que se sabe do que se
                  supõe. Depois evolua para personas priorizadas e acionáveis.
                </p>
              </div>
              <Link
                to="/deepersona/csd"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm hover:bg-white/20 transition"
              >
                Começar pelo CSD <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {METHODOLOGY.map((s) => {
                const StepIcon = s.icon;
                const inner = (
                  <div
                    className={`group relative flex h-full items-start gap-3 rounded-2xl border p-4 transition ${
                      s.to
                        ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 cursor-pointer"
                        : "border-white/5 bg-white/[0.02] opacity-70"
                    }`}
                  >
                    <div
                      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 40%, transparent), color-mix(in oklab, ${mod.color} 10%, transparent))`,
                      }}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
                          {s.step}
                        </span>
                        {s.status === "soon" && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase tracking-wider"
                          >
                            Em breve
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium mt-0.5">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {s.description}
                      </p>
                    </div>
                    {s.to && (
                      <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-0 transition group-hover:opacity-100" />
                    )}
                  </div>
                );
                return s.to ? (
                  <Link key={s.step} to={s.to}>
                    {inner}
                  </Link>
                ) : (
                  <div key={s.step}>{inner}</div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="font-display text-xl font-semibold">
              Suas personas
            </h2>
            <p className="text-sm text-muted-foreground">
              Etapa 04 · Canvas detalhado por persona.
            </p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}

          {list.data && list.data.items.length === 0 && (
            <div className="col-span-full surface-card p-10 text-center space-y-3">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="font-medium">Nenhuma persona ainda</h3>
              <p className="text-sm text-muted-foreground">
                Crie sua primeira persona — a IA ajuda em cada etapa.
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Criar com IA
              </Button>
            </div>
          )}

          {list.data?.items.map((p) => {
            const stageIdx = Math.max(0, STAGE_ORDER.indexOf(p.stage ?? "draft"));
            const progress = Math.round((stageIdx / (STAGE_ORDER.length - 1)) * 100);
            return (
              <article
                key={p.id}
                className="surface-card group relative flex flex-col gap-3 p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                    {p.role && (
                      <p className="text-xs text-muted-foreground">{p.role}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {STAGE_LABEL[p.stage ?? "draft"]}
                  </Badge>
                </div>
                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {p.description}
                  </p>
                )}
                <div className="mt-auto space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${mod.color}, color-mix(in oklab, ${mod.color} 50%, white))`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      to="/deepersona/$id"
                      params={{ id: p.id }}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Abrir persona
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover persona?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(p.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
