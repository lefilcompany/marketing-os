import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getModule } from "@/lib/modules";
import { useWorkspace } from "@/lib/workspace-context";
import {
  listResearchSources,
  createResearchSource,
  deleteResearchSource,
  extractInsights,
} from "@/lib/research.functions";
import { listCsdItems } from "@/lib/csd.functions";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Database,
  Plus,
  Loader2,
  Trash2,
  Sparkles,
  MessageSquare,
  ClipboardList,
  BarChart3,
  Share2,
  Users,
  FileText,
  Link2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/deepersona/coleta")({
  head: () => ({ meta: [{ title: "Coleta de Dados — DeePersona" }] }),
  component: ColetaPage,
});

const KIND_META: Record<
  string,
  { label: string; icon: typeof MessageSquare; tone: string }
> = {
  interview: { label: "Entrevista", icon: MessageSquare, tone: "text-sky-300" },
  survey: { label: "Pesquisa", icon: ClipboardList, tone: "text-violet-300" },
  analytics: { label: "Analytics", icon: BarChart3, tone: "text-emerald-300" },
  social: { label: "Social", icon: Share2, tone: "text-pink-300" },
  crm: { label: "CRM", icon: Users, tone: "text-amber-300" },
  desk: { label: "Desk research", icon: FileText, tone: "text-slate-300" },
  other: { label: "Outro", icon: Database, tone: "text-muted-foreground" },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  planned: { label: "Planejado", className: "bg-white/10 text-muted-foreground" },
  collecting: { label: "Coletando", className: "bg-sky-500/15 text-sky-300" },
  analyzed: { label: "Analisado", className: "bg-emerald-500/15 text-emerald-300" },
  archived: { label: "Arquivado", className: "bg-white/5 text-muted-foreground" },
};

function ColetaPage() {
  const mod = getModule("deepersona")!;
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("interview");
  const [csdId, setCsdId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const list = useQuery({
    queryKey: ["research", currentOrgId],
    queryFn: () => listResearchSources({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const csd = useQuery({
    queryKey: ["csd", currentOrgId],
    queryFn: () => listCsdItems({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const items = list.data?.items ?? [];
  const csdItems = csd.data?.items ?? [];

  const create = useMutation({
    mutationFn: () =>
      createResearchSource({
        data: {
          organizationId: currentOrgId!,
          title: title.trim(),
          kind: kind as "interview",
          notes: notes.trim() || undefined,
          csdItemId: csdId !== "none" ? csdId : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Fonte adicionada");
      qc.invalidateQueries({ queryKey: ["research", currentOrgId] });
      setOpen(false);
      setTitle("");
      setKind("interview");
      setCsdId("none");
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteResearchSource({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research", currentOrgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const extract = useMutation({
    mutationFn: (id: string) => extractInsights({ data: { id } }),
    onSuccess: () => {
      toast.success("Insights extraídos");
      qc.invalidateQueries({ queryKey: ["research", currentOrgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = {
    total: items.length,
    analyzed: items.filter((i) => i.status === "analyzed").length,
    insights: items.reduce(
      (n, i) => n + (Array.isArray(i.insights) ? (i.insights as unknown[]).length : 0),
      0,
    ),
  };

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
          <span className="font-medium">Coleta de Dados</span>
        </div>

        <header className="flex items-start gap-5">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 shadow-elevated"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 55%, transparent), color-mix(in oklab, ${mod.color} 20%, transparent))`,
            }}
          >
            <Database className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Etapa 02 · Coleta de dados
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              Coleta de Dados
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Reúna entrevistas, pesquisas, analytics e desk research. Cada
              fonte pode validar uma <strong>suposição</strong> ou responder uma{" "}
              <strong>dúvida</strong> da Matriz CSD.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nova fonte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar fonte de pesquisa</DialogTitle>
                <DialogDescription>
                  Descreva a fonte e cole notas — a IA extrai insights depois.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Título</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Entrevista Marina, gerente de e-commerce"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={kind} onValueChange={setKind}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(KIND_META).map(([k, m]) => (
                          <SelectItem key={k} value={k}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vincular ao CSD</Label>
                    <Select value={csdId} onValueChange={setCsdId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {csdItems.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            [{c.category}] {c.text.slice(0, 50)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notas brutas</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    placeholder="Cole aqui a transcrição, resposta da pesquisa, dados coletados..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  disabled={!title.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Fontes", value: counts.total, icon: Database },
            { label: "Analisadas", value: counts.analyzed, icon: Sparkles },
            { label: "Insights", value: counts.insights, icon: BarChart3 },
          ].map((s) => {
            const I = s.icon;
            return (
              <div
                key={s.label}
                className="surface-card p-4 flex items-center gap-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
                  <I className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lista de fontes */}
        <section className="space-y-3">
          {items.length === 0 && (
            <div className="surface-card p-10 text-center space-y-3">
              <Database className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="font-medium">Nenhuma fonte ainda</h3>
              <p className="text-sm text-muted-foreground">
                Comece por uma entrevista ou colando dados de analytics.
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar fonte
              </Button>
            </div>
          )}

          {items.map((s) => {
            const meta = KIND_META[s.kind] ?? KIND_META.other;
            const status = STATUS_META[s.status] ?? STATUS_META.planned;
            const Icon = meta.icon;
            const insights = Array.isArray(s.insights) ? (s.insights as string[]) : [];
            const linkedCsd = csdItems.find((c) => c.id === s.csd_item_id);
            return (
              <Card key={s.id} className="surface-card group">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl bg-white/5 ${meta.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{s.title}</CardTitle>
                      <Badge className={`text-[10px] ${status.className}`}>
                        {status.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {meta.label}
                      </Badge>
                      {linkedCsd && (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <Link2 className="h-3 w-3" />
                          {linkedCsd.category}
                        </Badge>
                      )}
                    </div>
                    {s.summary && (
                      <CardDescription className="mt-1.5 line-clamp-2">
                        {s.summary}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => extract.mutate(s.id)}
                      disabled={extract.isPending}
                      className="gap-1.5"
                    >
                      {extract.isPending && extract.variables === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Insights IA
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove.mutate(s.id)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {insights.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1.5">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Insights
                      </p>
                      <ul className="space-y-1 text-sm">
                        {insights.map((ins, i) => (
                          <li key={i} className="flex gap-2">
                            <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary opacity-60" />
                            <span>{ins}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </section>

        {/* Próxima etapa */}
        {items.length > 0 && (
          <Link
            to="/deepersona/segmentacao"
            className="surface-card flex items-center justify-between gap-4 p-5 hover:bg-white/[0.04] transition group"
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Próxima etapa
              </p>
              <h3 className="font-display text-lg font-semibold mt-1">
                Segmentar em clusters
              </h3>
              <p className="text-sm text-muted-foreground">
                Com os dados coletados, gere clusters que viram personas.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
          </Link>
        )}
      </div>
    </div>
  );
}
