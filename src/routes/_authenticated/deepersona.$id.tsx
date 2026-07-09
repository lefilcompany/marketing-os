import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  getPersona,
  updatePersona,
  generatePersonaBase,
  generateICP,
  generateJourney,
  generateInsights,
} from "@/lib/personas.functions";
import {
  listProjects,
  createProject,
  createTaskFromInsight,
} from "@/lib/tasks.functions";
import { getModule } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Save,
  Users,
  Target,
  Map as MapIcon,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Compass,
  ListPlus,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const STAGE_LABEL: Record<string, string> = {
  draft: "Rascunho",
  base: "Base",
  icp: "ICP",
  journey: "Jornada",
  insights: "Insights",
  live: "Viva",
};
const STAGE_ORDER = ["draft", "base", "icp", "journey", "insights", "live"];

type JourneyStage = {
  key: string;
  label: string;
  goal: string;
  thinking: string;
  feeling: string;
  doing: string[];
  touchpoints: string[];
  questions: string[];
  content_ideas: string[];
  friction: string;
};

type Insight = {
  title: string;
  body: string;
  kind: "oportunidade" | "risco" | "hipotese" | "descoberta";
  confidence: "baixa" | "media" | "alta";
  next_action: string;
};

export const Route = createFileRoute("/_authenticated/deepersona/$id")({
  head: () => ({ meta: [{ title: "Persona — DeePersona" }] }),
  component: PersonaDetail,
});

function PersonaDetail() {
  const { id } = useParams({ from: "/_authenticated/deepersona/$id" });
  const mod = getModule("deepersona")!;
  const qc = useQueryClient();

  const personaQ = useQuery({
    queryKey: ["persona", id],
    queryFn: () => getPersona({ data: { id } }),
  });

  const persona = personaQ.data?.item;
  const stageIdx = Math.max(0, STAGE_ORDER.indexOf(persona?.stage ?? "draft"));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["persona", id] });
    qc.invalidateQueries({ queryKey: ["personas"] });
  };

  const genBase = useMutation({
    mutationFn: (briefing: string) => generatePersonaBase({ data: { id, briefing } }),
    onSuccess: () => { toast.success("Base gerada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const genICP = useMutation({
    mutationFn: () => generateICP({ data: { id } }),
    onSuccess: () => { toast.success("ICP gerado"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const genJourney = useMutation({
    mutationFn: () => generateJourney({ data: { id } }),
    onSuccess: () => { toast.success("Jornada gerada"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const genInsights = useMutation({
    mutationFn: () => generateInsights({ data: { id } }),
    onSuccess: () => { toast.success("Insights gerados"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (personaQ.isLoading || !persona) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const icp = (persona.icp ?? {}) as Record<string, unknown>;
  const journey = (persona.journey ?? []) as JourneyStage[];
  const insights = (persona.insights ?? []) as Insight[];

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10 opacity-50"
        style={{
          background: `radial-gradient(60% 100% at 20% 0%, color-mix(in oklab, ${mod.color} 30%, transparent), transparent 70%)`,
        }}
      />

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        <Link
          to="/deepersona"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todas as personas
        </Link>

        <header className="flex items-start gap-5">
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl border border-white/20 shadow-elevated text-white font-display text-2xl font-semibold"
            style={{
              background: `linear-gradient(135deg, color-mix(in oklab, ${mod.color} 65%, transparent), color-mix(in oklab, ${mod.color} 25%, transparent))`,
            }}
          >
            {persona.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                Estágio · {STAGE_LABEL[persona.stage ?? "draft"]}
              </Badge>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                DeePersona
              </p>
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">
              {persona.name}
            </h1>
            {persona.role && (
              <p className="text-muted-foreground">{persona.role}</p>
            )}
          </div>
        </header>

        <StageBar stageIdx={stageIdx} color={mod.color} />

        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid grid-cols-4 max-w-xl">
            <TabsTrigger value="base"><Users className="h-3.5 w-3.5 mr-1.5" />Base</TabsTrigger>
            <TabsTrigger value="icp"><Target className="h-3.5 w-3.5 mr-1.5" />ICP</TabsTrigger>
            <TabsTrigger value="journey"><MapIcon className="h-3.5 w-3.5 mr-1.5" />Jornada</TabsTrigger>
            <TabsTrigger value="insights"><Lightbulb className="h-3.5 w-3.5 mr-1.5" />Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="base" className="mt-6">
            <BaseEditor persona={persona} onGenerate={(b) => genBase.mutate(b)} pending={genBase.isPending} />
          </TabsContent>

          <TabsContent value="icp" className="mt-6">
            <ICPView icp={icp} onGenerate={() => genICP.mutate()} pending={genICP.isPending} />
          </TabsContent>

          <TabsContent value="journey" className="mt-6">
            <JourneyView journey={journey} color={mod.color} onGenerate={() => genJourney.mutate()} pending={genJourney.isPending} />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <InsightsView insights={insights} onGenerate={() => genInsights.mutate()} pending={genInsights.isPending} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StageBar({ stageIdx, color }: { stageIdx: number; color: string }) {
  const progress = Math.round((stageIdx / (STAGE_ORDER.length - 1)) * 100);
  return (
    <div className="surface-card p-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-[0.2em] text-muted-foreground">Persona viva</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 40%, white))` }}
        />
      </div>
      <div className="grid grid-cols-6 text-[10px] text-muted-foreground">
        {STAGE_ORDER.map((s, i) => (
          <span key={s} className={i <= stageIdx ? "text-foreground" : ""}>
            {STAGE_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------ BASE ------------ */
function BaseEditor({
  persona,
  onGenerate,
  pending,
}: {
  persona: { id: string; description: string | null; role: string | null; demographics: unknown; pains: unknown; gains: unknown; channels: unknown };
  onGenerate: (b: string) => void;
  pending: boolean;
}) {
  const qc = useQueryClient();
  const [description, setDescription] = useState(persona.description ?? "");
  const [role, setRole] = useState(persona.role ?? "");
  const [briefing, setBriefing] = useState("");

  useEffect(() => {
    setDescription(persona.description ?? "");
    setRole(persona.role ?? "");
  }, [persona.description, persona.role]);

  const demographics = (persona.demographics ?? {}) as Record<string, string>;
  const pains = (persona.pains ?? []) as string[];
  const gains = (persona.gains ?? []) as string[];
  const channels = (persona.channels ?? []) as string[];

  const save = useMutation({
    mutationFn: () =>
      updatePersona({ data: { id: persona.id, patch: { description, role } } }),
    onSuccess: () => {
      toast.success("Base salva");
      qc.invalidateQueries({ queryKey: ["persona", persona.id] });
    },
  });

  const hasBase = pains.length > 0 || gains.length > 0;

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Base da persona</h2>
          {hasBase && (
            <Button variant="ghost" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Salvar
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cargo / rótulo</Label>
            <Input value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>

        {!hasBase && (
          <div className="rounded-xl border border-dashed border-white/10 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Descreva o contexto em uma frase e a IA gera dores, ganhos, canais e demografia.
            </p>
            <Textarea
              placeholder="Ex.: gestora de marketing em SaaS B2B de médio porte no Brasil, foco em geração de demanda..."
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => onGenerate(briefing || description)}
              disabled={pending || (!briefing && !description)}
              className="gap-2"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar base com IA
            </Button>
          </div>
        )}
      </div>

      {hasBase && (
        <div className="grid gap-4 md:grid-cols-2">
          <ChipCard title="Demografia">
            <dl className="grid grid-cols-1 gap-1.5 text-sm">
              {Object.entries(demographics).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</dt>
                  <dd className="text-right">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </ChipCard>
          <ChipCard title="Canais">
            <ChipList items={channels} />
          </ChipCard>
          <ChipCard title="Dores">
            <BulletList items={pains} />
          </ChipCard>
          <ChipCard title="Ganhos">
            <BulletList items={gains} />
          </ChipCard>
        </div>
      )}
    </div>
  );
}

/* ------------ ICP ------------ */
function ICPView({
  icp,
  onGenerate,
  pending,
}: {
  icp: Record<string, unknown>;
  onGenerate: () => void;
  pending: boolean;
}) {
  const hasICP = Object.keys(icp).length > 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Perfil Ideal de Cliente</h2>
        <Button onClick={onGenerate} disabled={pending} className="gap-2" variant={hasICP ? "secondary" : "default"}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {hasICP ? "Regerar ICP" : "Gerar ICP com IA"}
        </Button>
      </div>

      {!hasICP ? (
        <EmptyState icon={<Target className="h-6 w-6" />} label="ICP ainda não definido. A IA analisa a base da persona e propõe segmento, gatilhos e critérios." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ChipCard title="Segmento">{String(icp.segment ?? "-")}</ChipCard>
          <ChipCard title="Tamanho de empresa">{String(icp.company_size ?? "-")}</ChipCard>
          <ChipCard title="Geografia">{String(icp.geography ?? "-")}</ChipCard>
          <ChipCard title="Orçamento">{String(icp.budget_range ?? "-")}</ChipCard>
          <ChipCard title="Indústrias"><ChipList items={(icp.industries as string[]) ?? []} /></ChipCard>
          <ChipCard title="Decisores"><ChipList items={(icp.decision_makers as string[]) ?? []} /></ChipCard>
          <ChipCard title="Gatilhos de compra"><BulletList items={(icp.buying_triggers as string[]) ?? []} /></ChipCard>
          <ChipCard title="Critérios de decisão"><BulletList items={(icp.decision_criteria as string[]) ?? []} /></ChipCard>
          <ChipCard title="Desqualificadores" className="md:col-span-2"><BulletList items={(icp.disqualifiers as string[]) ?? []} /></ChipCard>
        </div>
      )}
    </div>
  );
}

/* ------------ JOURNEY ------------ */
function JourneyView({
  journey,
  color,
  onGenerate,
  pending,
}: {
  journey: JourneyStage[];
  color: string;
  onGenerate: () => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Jornada da persona</h2>
        <Button onClick={onGenerate} disabled={pending} className="gap-2" variant={journey.length ? "secondary" : "default"}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {journey.length ? "Regerar jornada" : "Gerar jornada com IA"}
        </Button>
      </div>

      {journey.length === 0 ? (
        <EmptyState icon={<MapIcon className="h-6 w-6" />} label="A jornada mapeia descoberta, consideração, decisão, uso e fidelização." />
      ) : (
        <div className="space-y-3">
          {journey.map((s, i) => (
            <div key={i} className="surface-card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-8 w-8 place-items-center rounded-lg text-white text-sm font-semibold"
                  style={{ background: `color-mix(in oklab, ${color} 50%, transparent)` }}
                >
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-display font-semibold">{s.label}</h3>
                  <p className="text-xs text-muted-foreground">{s.goal}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Compass className="h-3 w-3" /> Pensa
                  </div>
                  {s.thinking}
                </div>
                <div className="rounded-lg bg-white/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Compass className="h-3 w-3" /> Sente
                  </div>
                  {s.feeling}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Faz</p>
                  <BulletList items={s.doing} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pontos de contato</p>
                  <ChipList items={s.touchpoints} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><HelpCircle className="h-3 w-3" />Perguntas</p>
                  <BulletList items={s.questions} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ideias de conteúdo</p>
                  <BulletList items={s.content_ideas} />
                </div>
                <div className="md:col-span-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-yellow-500 mb-1">
                    <AlertTriangle className="h-3 w-3" /> Fricção
                  </div>
                  <p className="text-sm">{s.friction}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------ INSIGHTS ------------ */
function InsightsView({
  insights,
  onGenerate,
  pending,
}: {
  insights: Insight[];
  onGenerate: () => void;
  pending: boolean;
}) {
  const kindStyle: Record<string, { bg: string; ring: string; icon: React.ReactNode }> = {
    oportunidade: { bg: "bg-emerald-500/10", ring: "border-emerald-500/30", icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> },
    risco: { bg: "bg-red-500/10", ring: "border-red-500/30", icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> },
    hipotese: { bg: "bg-blue-500/10", ring: "border-blue-500/30", icon: <HelpCircle className="h-3.5 w-3.5 text-blue-500" /> },
    descoberta: { bg: "bg-purple-500/10", ring: "border-purple-500/30", icon: <Lightbulb className="h-3.5 w-3.5 text-purple-500" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Insights</h2>
        <Button onClick={onGenerate} disabled={pending} className="gap-2" variant={insights.length ? "secondary" : "default"}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {insights.length ? "Regerar insights" : "Gerar insights com IA"}
        </Button>
      </div>

      {insights.length === 0 ? (
        <EmptyState icon={<Lightbulb className="h-6 w-6" />} label="Insights transformam a persona em decisões: oportunidades, riscos e próximas ações." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((i, idx) => {
            const style = kindStyle[i.kind] ?? kindStyle.descoberta;
            return (
              <div key={idx} className={`rounded-2xl border ${style.ring} ${style.bg} p-4 space-y-2`}>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="gap-1 text-[10px] capitalize">
                    {style.icon}
                    {i.kind}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Confiança · {i.confidence}
                  </span>
                </div>
                <h3 className="font-medium">{i.title}</h3>
                <p className="text-sm text-muted-foreground">{i.body}</p>
                <div className="pt-1 border-t border-white/5 text-xs">
                  <span className="text-muted-foreground">Próxima ação: </span>
                  <span className="font-medium">{i.next_action}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------ helpers ------------ */
function ChipCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`surface-card p-4 space-y-2 ${className ?? ""}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function ChipList({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-muted-foreground">-</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs">
          {it}
        </span>
      ))}
    </div>
  );
}
function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-muted-foreground">-</span>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
          {it}
        </li>
      ))}
    </ul>
  );
}
function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="surface-card p-10 text-center space-y-3">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-muted-foreground">
        {icon}
      </div>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{label}</p>
    </div>
  );
}
