import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace-context";
import { listPersonas, createPersona, generatePersonaBase, generateICP } from "@/lib/personas.functions";
import { listSegments } from "@/lib/segments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Users, Plus, Loader2, Sparkles, UserCircle2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

type Persona = {
  id: string;
  name: string;
  role: string | null;
  stage: string | null;
  description: string | null;
  icp: Record<string, unknown> | null;
};

export function StepPersonas({
  onAutoComplete,
  onSelectPersona,
}: {
  onAutoComplete: () => void;
  onSelectPersona: (id: string) => void;
}) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const segs = useQuery({
    queryKey: ["segments", currentOrgId],
    queryFn: () => listSegments({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const personas = (list.data?.items ?? []) as Persona[];
  const segments = segs.data?.items ?? [];

  const done = personas.length > 0;
  useEffect(() => { if (done) onAutoComplete(); }, [done, onAutoComplete]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [briefing, setBriefing] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const p = await createPersona({
        data: {
          organizationId: currentOrgId!,
          name: name.trim(),
          role: role.trim() || undefined,
          description: briefing.trim() || undefined,
        },
      });
      if (briefing.trim().length >= 4) {
        generatePersonaBase({ data: { id: p.item.id, briefing: briefing.trim() } })
          .then(() => generateICP({ data: { id: p.item.id } }))
          .then(() => {
            qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
            qc.invalidateQueries({ queryKey: ["persona", p.item.id] });
            toast.success(`Canvas de "${p.item.name}" pronto`);
          })
          .catch((e: Error) => toast.error(`Falha ao gerar: ${e.message}`));
      }
      return p.item;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      setOpen(false); setName(""); setRole(""); setBriefing("");
      onSelectPersona(p.id);
      toast.success("Persona criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteSegment = useMutation({
    mutationFn: async (seg: (typeof segments)[number]) => {
      const chars = Array.isArray(seg.characteristics) ? (seg.characteristics as string[]) : [];
      const brief = [
        seg.hypothesis,
        chars.length ? "Características: " + chars.join(", ") : "",
        seg.size_estimate ? "Tamanho: " + seg.size_estimate : "",
      ].filter(Boolean).join(". ");
      const p = await createPersona({
        data: { organizationId: currentOrgId!, name: seg.name, description: brief || undefined },
      });
      if (brief.length >= 4) {
        generatePersonaBase({ data: { id: p.item.id, briefing: brief } })
          .then(() => generateICP({ data: { id: p.item.id } }))
          .then(() => {
            qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
            toast.success(`Persona "${seg.name}" com base + ICP`);
          })
          .catch((e: Error) => toast.error(`Falha ao gerar: ${e.message}`));
      }
      return p.item;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      onSelectPersona(p.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promotableSegments = segments.filter(
    (s) => !personas.some((p) => p.name.toLowerCase() === s.name.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {promotableSegments.length > 0 && (
        <div className="surface-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold">Transformar segmentos em personas</h3>
              <p className="text-xs text-muted-foreground">A IA gera canvas + ICP baseados no cluster.</p>
            </div>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {promotableSegments.slice(0, 6).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => promoteSegment.mutate(s)}
                disabled={promoteSegment.isPending}
                className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition hover:bg-white/[0.06] disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  {s.hypothesis && <p className="text-[11px] text-muted-foreground truncate">{s.hypothesis}</p>}
                </div>
                {promoteSegment.isPending && promoteSegment.variables?.id === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Canvas criados</p>
          <h3 className="font-display text-lg font-semibold">
            {personas.length} persona{personas.length === 1 ? "" : "s"}
          </h3>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova persona</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar persona</DialogTitle>
              <DialogDescription>Preencha o esqueleto — a IA completa canvas + ICP.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Marina, gestora de e-commerce" /></div>
              <div className="space-y-1.5"><Label>Papel (opcional)</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex.: Head de Marketing" /></div>
              <div className="space-y-1.5"><Label>Briefing (opcional)</Label><Textarea value={briefing} onChange={(e) => setBriefing(e.target.value)} rows={4} placeholder="Contexto, dores, comportamento — a IA usa isso para preencher o canvas." /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {personas.length === 0 ? (
        <div className="surface-card p-10 text-center space-y-3">
          <UserCircle2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="font-medium">Nenhuma persona criada ainda</h3>
          <p className="text-sm text-muted-foreground">
            {promotableSegments.length > 0
              ? "Promova um segmento acima ou crie do zero."
              : "Volte para a Segmentação para gerar clusters, ou crie manualmente."}
          </p>
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {personas.map((p) => {
            const icp = (p.icp ?? {}) as Record<string, unknown>;
            const chips = [icp.segment, icp.company_size, icp.geography].filter(Boolean) as string[];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPersona(p.id)}
                className="surface-card group text-left p-5 space-y-2 hover:border-white/25 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 border border-white/10">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold truncate">{p.name}</h4>
                      <Badge variant="secondary" className="text-[10px]">{p.stage ?? "draft"}</Badge>
                    </div>
                    {p.role && <p className="text-xs text-muted-foreground truncate">{p.role}</p>}
                  </div>
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                {chips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] font-normal">{c}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground pt-1 opacity-0 group-hover:opacity-100 transition">
                  Selecionar como persona ativa →
                </p>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
