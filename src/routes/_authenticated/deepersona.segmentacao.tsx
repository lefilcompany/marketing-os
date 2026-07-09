import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getModule } from "@/lib/modules";
import { useWorkspace } from "@/lib/workspace-context";
import {
  listSegments,
  createSegment,
  deleteSegment,
  generateClusters,
} from "@/lib/segments.functions";
import { listResearchSources } from "@/lib/research.functions";
import { listCsdItems } from "@/lib/csd.functions";
import { createPersona, generatePersonaBase } from "@/lib/personas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  TrendingUp,
  Sparkles,
  Plus,
  Loader2,
  Trash2,
  Users,
  Target,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/deepersona/segmentacao")({
  head: () => ({ meta: [{ title: "Segmentação — DeePersona" }] }),
  component: SegmentacaoPage,
});

const PRIORITY_META: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-white/10 text-muted-foreground" },
  medium: { label: "Média", className: "bg-amber-500/15 text-amber-300" },
  high: { label: "Alta", className: "bg-emerald-500/15 text-emerald-300" },
};

function SegmentacaoPage() {
  const mod = getModule("deepersona")!;
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { flow?: string; step?: number };

  const list = useQuery({
    queryKey: ["segments", currentOrgId],
    queryFn: () => listSegments({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const csd = useQuery({
    queryKey: ["csd", currentOrgId],
    queryFn: () => listCsdItems({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const sources = useQuery({
    queryKey: ["research", currentOrgId],
    queryFn: () => listResearchSources({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const segments = list.data?.items ?? [];
  const csdCount = csd.data?.items.length ?? 0;
  const srcCount = sources.data?.items.length ?? 0;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [size, setSize] = useState("");
  const [chars, setChars] = useState("");

  const generate = useMutation({
    mutationFn: () => generateClusters({ data: { organizationId: currentOrgId! } }),
    onSuccess: (r) => {
      toast.success(`${r.count} clusters gerados`);
      qc.invalidateQueries({ queryKey: ["segments", currentOrgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: () =>
      createSegment({
        data: {
          organizationId: currentOrgId!,
          name: name.trim(),
          hypothesis: hypothesis.trim() || undefined,
          priority,
          sizeEstimate: size.trim() || undefined,
          characteristics: chars
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      toast.success("Segmento criado");
      qc.invalidateQueries({ queryKey: ["segments", currentOrgId] });
      setOpen(false);
      setName("");
      setHypothesis("");
      setSize("");
      setChars("");
      setPriority("medium");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSegment({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["segments", currentOrgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const promote = useMutation({
    mutationFn: async (seg: (typeof segments)[number]) => {
      const chars = Array.isArray(seg.characteristics)
        ? (seg.characteristics as string[])
        : [];
      const briefing = [
        seg.hypothesis,
        chars.length ? "Características: " + chars.join(", ") : "",
        seg.size_estimate ? "Tamanho estimado: " + seg.size_estimate : "",
      ]
        .filter(Boolean)
        .join(". ");

      // 1) Cria a persona já com descrição do segmento (aparece no editor na hora).
      const p = await createPersona({
        data: {
          organizationId: currentOrgId!,
          name: seg.name,
          description: briefing || undefined,
        },
      });

      // 2) Dispara a geração da base + ICP em background — o editor recarrega sozinho.
      if (briefing.length >= 4) {
        try { sessionStorage.setItem(`deepersona:generating:${p.item.id}`, "1"); } catch { /* noop */ }
        generatePersonaBase({ data: { id: p.item.id, briefing } })
          .then(() => generateICP({ data: { id: p.item.id } }))
          .then(() => {
            try { sessionStorage.removeItem(`deepersona:generating:${p.item.id}`); } catch { /* noop */ }
            qc.invalidateQueries({ queryKey: ["persona", p.item.id] });
            qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
            toast.success(`Persona "${seg.name}" pronta com base + ICP`);
          })
          .catch((e: Error) => {
            try { sessionStorage.removeItem(`deepersona:generating:${p.item.id}`); } catch { /* noop */ }
            toast.error(`Falha ao gerar: ${e.message}`);
          });
      }

      return p.item;
    },
    onSuccess: (persona) => {
      toast.success("Abrindo persona no Canvas…");
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      // Preserva estado do fluxo guiado (?flow=&step=) ao navegar.
      const nextSearch =
        search?.flow != null
          ? { flow: search.flow, step: search.step ?? 0 }
          : undefined;
      navigate({
        to: "/deepersona/$id",
        params: { id: persona.id },
        search: nextSearch as never,
      });
    },
    onError: (e: Error) => toast.error(e.message),
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
        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/deepersona"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> DeePersona
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Segmentação</span>
        </div>

        <header className="flex items-start gap-5">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 shadow-elevated"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 55%, transparent), color-mix(in oklab, ${mod.color} 20%, transparent))`,
            }}
          >
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Etapa 03 · Segmentação
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              Segmentação & Clusters
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Agrupe padrões da coleta em clusters distintos. Cada cluster
              vira uma persona no próximo passo.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" /> Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar segmento</DialogTitle>
                <DialogDescription>
                  Defina um cluster de audiência manualmente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Gestoras premium em SP"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hipótese</Label>
                  <Textarea
                    value={hypothesis}
                    onChange={(e) => setHypothesis(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prioridade</Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tamanho estimado</Label>
                    <Input
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      placeholder="~30% da base"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Características (1 por linha)</Label>
                  <Textarea
                    value={chars}
                    onChange={(e) => setChars(e.target.value)}
                    rows={4}
                  />
                </div>
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Criar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* IA hero */}
        <div className="surface-card relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(60% 80% at 100% 0%, color-mix(in oklab, ${mod.color} 30%, transparent), transparent 70%)`,
            }}
          />
          <div className="relative p-6 flex items-center gap-5 flex-wrap">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-[240px]">
              <h2 className="font-display text-lg font-semibold">
                Gerar clusters com IA
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                A IA combina{" "}
                <strong className="text-foreground">{csdCount}</strong> itens
                CSD +{" "}
                <strong className="text-foreground">{srcCount}</strong> fontes
                para propor segmentos acionáveis.
              </p>
              {csdCount + srcCount === 0 && (
                <p className="text-xs text-amber-300 mt-2">
                  Preencha a Matriz CSD ou adicione fontes antes.
                </p>
              )}
            </div>
            <Button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || csdCount + srcCount === 0}
              className="gap-2"
              size="lg"
            >
              {generate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar clusters
            </Button>
          </div>
        </div>

        {/* Grid de clusters */}
        <section className="grid gap-4 md:grid-cols-2">
          {segments.length === 0 && (
            <div className="md:col-span-2 surface-card p-10 text-center space-y-3">
              <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="font-medium">Nenhum segmento ainda</h3>
              <p className="text-sm text-muted-foreground">
                Gere com IA ou crie manualmente para começar.
              </p>
            </div>
          )}

          {segments.map((s) => {
            const prio = PRIORITY_META[s.priority] ?? PRIORITY_META.medium;
            const chars = Array.isArray(s.characteristics)
              ? (s.characteristics as string[])
              : [];
            const glow = s.color || "oklch(0.7 0.15 260)";
            return (
              <article
                key={s.id}
                className="surface-card group relative overflow-hidden p-5 space-y-3"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    background: `radial-gradient(80% 60% at 0% 0%, ${glow}, transparent 60%)`,
                  }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ background: glow }}
                      />
                      <h3 className="font-display text-lg font-semibold truncate">
                        {s.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-[10px] ${prio.className}`}>
                        <Target className="h-3 w-3 mr-1" /> {prio.label}
                      </Badge>
                      {s.size_estimate && (
                        <Badge variant="outline" className="text-[10px]">
                          {s.size_estimate}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove.mutate(s.id)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {s.hypothesis && (
                  <p className="relative text-sm text-muted-foreground">
                    {s.hypothesis}
                  </p>
                )}

                {chars.length > 0 && (
                  <ul className="relative space-y-1 text-sm">
                    {chars.slice(0, 5).map((c, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">·</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="relative pt-2 flex items-center justify-between border-t border-white/5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Cluster
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => promote.mutate(s)}
                    disabled={promote.isPending}
                  >
                    {promote.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    Virar persona
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
