import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace-context";
import { listPersonas } from "@/lib/personas.functions";
import { setPersonaPriority, suggestPriorities } from "@/lib/priorities.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2, Zap, Clock, Star } from "lucide-react";
import { toast } from "sonner";

type PersonaRow = {
  id: string;
  name: string;
  role: string | null;
  importance: number | null;
  urgency: number | null;
  stage: string | null;
};

const QUADRANTS = [
  { key: "focus", label: "Focar agora", desc: "Alta importância + alta urgência", cls: "from-emerald-500/20 to-emerald-500/5" },
  { key: "plan", label: "Planejar", desc: "Alta importância + baixa urgência", cls: "from-blue-500/20 to-blue-500/5" },
  { key: "opportunistic", label: "Oportunista", desc: "Baixa importância + alta urgência", cls: "from-amber-500/20 to-amber-500/5" },
  { key: "backlog", label: "Backlog", desc: "Baixa em ambos", cls: "from-white/10 to-transparent" },
];

function quadrantOf(imp: number, urg: number) {
  const hiI = imp >= 4;
  const hiU = urg >= 4;
  if (hiI && hiU) return "focus";
  if (hiI && !hiU) return "plan";
  if (!hiI && hiU) return "opportunistic";
  return "backlog";
}

export function StepPriorizacao({ onAutoComplete }: { onAutoComplete: () => void }) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const personas = (list.data?.items ?? []) as PersonaRow[];

  // Concluído quando todas as personas têm importance/urgency definidos.
  const done = personas.length > 0 && personas.every((p) => p.importance != null && p.urgency != null);
  useEffect(() => { if (done) onAutoComplete(); }, [done, onAutoComplete]);

  const save = useMutation({
    mutationFn: (p: { id: string; importance: number; urgency: number }) =>
      setPersonaPriority({ data: { id: p.id, importance: p.importance, urgency: p.urgency } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas", currentOrgId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const suggest = useMutation({
    mutationFn: () => suggestPriorities({ data: { organizationId: currentOrgId! } }),
    onSuccess: (r) => {
      toast.success(`${r.suggestions.length} personas priorizadas pela IA`);
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const g: Record<string, PersonaRow[]> = { focus: [], plan: [], opportunistic: [], backlog: [], unset: [] };
    for (const p of personas) {
      if (p.importance == null || p.urgency == null) g.unset.push(p);
      else g[quadrantOf(p.importance, p.urgency)].push(p);
    }
    return g;
  }, [personas]);

  if (list.isLoading) return <Skeleton className="h-96" />;
  if (personas.length === 0) {
    return (
      <div className="surface-card p-10 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Crie personas antes de priorizar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => suggest.mutate()} disabled={suggest.isPending} className="gap-2">
          {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Sugerir com IA
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {QUADRANTS.map((q) => (
          <article key={q.key} className="surface-card relative overflow-hidden p-5">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${q.cls} opacity-70`} />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold">{q.label}</h3>
                  <p className="text-xs text-muted-foreground">{q.desc}</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{grouped[q.key].length}</Badge>
              </div>
              {grouped[q.key].length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma persona aqui.</p>
              ) : (
                <ul className="space-y-1.5">
                  {grouped[q.key].map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">I{p.importance} · U{p.urgency}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Ajuste fino</h2>
          <p className="text-xs text-muted-foreground">Escala 1 (baixo) a 5 (alto)</p>
        </div>
        <ul className="divide-y divide-white/5">
          {personas.map((p) => (
            <PriorityRow key={p.id} persona={p} onSave={(imp, urg) => save.mutate({ id: p.id, importance: imp, urgency: urg })} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function PriorityRow({
  persona,
  onSave,
}: {
  persona: PersonaRow;
  onSave: (importance: number, urgency: number) => void;
}) {
  const [imp, setImp] = useState<number>(persona.importance ?? 3);
  const [urg, setUrg] = useState<number>(persona.urgency ?? 3);
  const dirty = imp !== (persona.importance ?? 3) || urg !== (persona.urgency ?? 3);

  return (
    <li className="py-4 grid gap-4 md:grid-cols-[1fr_auto_auto_auto] items-center">
      <div className="min-w-0">
        <p className="font-medium truncate">{persona.name}</p>
        {persona.role && <p className="text-xs text-muted-foreground truncate">{persona.role}</p>}
      </div>
      <div className="flex items-center gap-3 min-w-[180px]">
        <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <Slider min={1} max={5} step={1} value={[imp]} onValueChange={(v) => setImp(v[0])} className="w-32" />
        <span className="text-xs w-4 text-right tabular-nums">{imp}</span>
      </div>
      <div className="flex items-center gap-3 min-w-[180px]">
        <Zap className="h-3.5 w-3.5 text-rose-400 shrink-0" />
        <Slider min={1} max={5} step={1} value={[urg]} onValueChange={(v) => setUrg(v[0])} className="w-32" />
        <span className="text-xs w-4 text-right tabular-nums">{urg}</span>
      </div>
      <Button size="sm" variant={dirty ? "default" : "ghost"} disabled={!dirty} onClick={() => onSave(imp, urg)} className="gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Salvar
      </Button>
    </li>
  );
}
