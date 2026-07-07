import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessionBootstrap, getWorkspaceApps, getRecentAccess, toggleFavorite } from "@/lib/workspace.functions";
import { resolveAppRedirect } from "@/lib/applications.functions";
import { listAnnouncements } from "@/lib/notifications.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, Star, StarOff, ExternalLink, Sparkles, Layers,
  BarChart3, Users, Circle, Megaphone, Brain, PenTool, Rocket, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Visão geral — Marketing OS" }] }),
  component: Dashboard,
});

const ICONS: Record<string, any> = {
  Sparkles, Layers, BarChart3, Users, Circle, Brain, PenTool, Rocket, Activity,
  Kanban: Layers,
};

function Dashboard() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const apps = useQuery({
    queryKey: ["ws-apps", currentOrgId],
    queryFn: () => getWorkspaceApps({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const recent = useQuery({
    queryKey: ["recent", currentOrgId],
    queryFn: () => getRecentAccess({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const ann = useQuery({ queryKey: ["announcements"], queryFn: () => listAnnouncements() });

  const firstName = (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-hero text-primary-foreground p-6 lg:p-10">
        <div className="absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative space-y-4 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-white/60">Central de marketing</p>
          <h1 className="font-display text-3xl lg:text-4xl font-semibold">
            Olá, {firstName}. O que vamos construir hoje?
          </h1>
          <p className="text-white/80 max-w-xl">
            Acesse suas ferramentas, acompanhe sua operação e mantenha todo o seu marketing conectado.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="secondary" asChild>
              <a href="/aplicacoes"><Rocket className="h-4 w-4" /> Explorar aplicações</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Aplicações disponíveis" value={apps.data?.apps.length ?? 0} loading={apps.isLoading} />
        <SummaryCard label="Favoritas" value={apps.data?.apps.filter((a: any) => a.isFavorite).length ?? 0} loading={apps.isLoading} />
        <SummaryCard label="Últimos acessos" value={recent.data?.items.length ?? 0} loading={recent.isLoading} />
        <SummaryCard label="Comunicados" value={ann.data?.items.length ?? 0} loading={ann.isLoading} />
      </section>

      {/* Continue */}
      {(recent.data?.items.length ?? 0) > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Continue seu trabalho" hint="Últimas plataformas acessadas" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {recent.data!.items.map((it: any) => it.application && (
              <ContinueCard key={it.id} app={it.application} lastAt={it.created_at} />
            ))}
          </div>
        </section>
      )}

      {/* Applications */}
      <section className="space-y-3">
        <SectionHeader title="Suas aplicações" hint="Ferramentas liberadas para este workspace" />
        {apps.isLoading && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i=><Skeleton key={i} className="h-48" />)}</div>}
        {apps.data && apps.data.apps.length === 0 && (
          <EmptyState title="Nenhuma aplicação liberada" message="Solicite ao administrador da sua empresa para liberar aplicações." />
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.data?.apps.map((a: any) => <ApplicationCard key={a.id} app={a} orgId={currentOrgId!} />)}
        </div>
      </section>

      {/* Journey */}
      <section className="space-y-3">
        <SectionHeader title="Jornada do marketing" hint="Quatro etapas conectadas dentro do Marketing OS" />
        <JourneyDiagram />
      </section>

      {/* Announcements */}
      {(ann.data?.items.length ?? 0) > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Comunicados da LeFil" />
          <div className="space-y-2">
            {ann.data!.items.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="p-4 flex gap-3">
                  <Megaphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{a.title}</div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{a.content}</p>
                    {a.action_url && <a href={a.action_url} className="text-xs text-primary underline mt-2 inline-block">Saiba mais</a>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(a.published_at ?? a.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold">
          {loading ? <Skeleton className="h-7 w-10" /> : value}
        </div>
      </CardContent>
    </Card>
  );
}

function ContinueCard({ app, lastAt }: { app: any; lastAt: string }) {
  const nav = useNavigate();
  const openM = useMutation({
    mutationFn: () => resolveAppRedirect({ data: { organizationId: app.organization_id ?? "", applicationId: app.id } }),
  });

  return (
    <Card
      onClick={() => nav({ to: "/aplicacoes/$slug", params: { slug: app.slug } })}
      className="cursor-pointer group transition-all hover:shadow-elevated hover:-translate-y-0.5"
      style={{ borderTop: `3px solid ${app.accent_color ?? "var(--primary)"}` }}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AppIcon app={app} size="sm" />
          <div className="text-sm font-semibold">{app.name}</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Último acesso {formatDistanceToNow(new Date(lastAt), { addSuffix: true, locale: ptBR })}
        </div>
        <div className="pt-1">
          <span className="text-xs text-primary group-hover:underline inline-flex items-center gap-1">
            Continuar <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationCard({ app, orgId }: { app: any; orgId: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();

  const fav = useMutation({
    mutationFn: () => toggleFavorite({ data: { organizationId: orgId, applicationId: app.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ws-apps", orgId] }),
  });

  const open = useMutation({
    mutationFn: () => resolveAppRedirect({ data: { organizationId: orgId, applicationId: app.id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["recent", orgId] });
      if (r.openMode === "same_tab") window.location.href = r.url;
      else window.open(r.url, "_blank", "noopener,noreferrer");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusInfo = statusMeta(app.status);

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5"
      style={{ borderTop: `3px solid ${app.accent_color ?? "var(--primary)"}` }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
           style={{ background: `radial-gradient(circle at top right, ${app.accent_color ?? "var(--primary)"}15, transparent 60%)` }} />
      <CardHeader className="pb-2 relative">
        <div className="flex items-start justify-between">
          <AppIcon app={app} />
          <button
            onClick={() => fav.mutate()}
            className="text-muted-foreground hover:text-foreground"
            aria-label={app.isFavorite ? "Remover dos favoritos" : "Favoritar"}
          >
            {app.isFavorite ? <Star className="h-4 w-4 fill-warning text-warning" /> : <StarOff className="h-4 w-4" />}
          </button>
        </div>
        <CardTitle className="font-display text-base pt-2 flex items-center gap-2">
          {app.name}
          {app.is_new && <Badge variant="secondary">Novo</Badge>}
        </CardTitle>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{categoryLabel(app.category)}</Badge>
          <span className={`inline-flex items-center gap-1 text-[11px] ${statusInfo.className}`}>
            <Circle className="h-1.5 w-1.5 fill-current" />{statusInfo.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{app.short_description}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={!app.canAccess || open.isPending}
            onClick={() => open.mutate()}
          >
            <ExternalLink className="h-4 w-4" />
            {app.canAccess ? "Abrir aplicação" : "Sem permissão"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => nav({ to: "/aplicacoes/$slug", params: { slug: app.slug } })}>
            Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AppIcon({ app, size = "md" }: { app: any; size?: "sm" | "md" }) {
  const Icon = ICONS[app.icon] ?? Sparkles;
  const s = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={`${s} rounded-lg grid place-items-center shrink-0`}
         style={{ background: `${app.accent_color ?? "var(--primary)"}18`, color: app.accent_color ?? "var(--primary)" }}>
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <Card><CardContent className="p-10 text-center">
      <div className="font-semibold">{title}</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{message}</p>
    </CardContent></Card>
  );
}

function statusMeta(s: string) {
  switch (s) {
    case "available": return { label: "Disponível", className: "text-success" };
    case "unstable": return { label: "Instável", className: "text-warning" };
    case "maintenance": return { label: "Em manutenção", className: "text-warning" };
    case "unavailable": return { label: "Indisponível", className: "text-destructive" };
    case "coming_soon": return { label: "Em breve", className: "text-muted-foreground" };
    default: return { label: s, className: "text-muted-foreground" };
  }
}

export function categoryLabel(c: string) {
  return {
    strategy: "Estratégia", content: "Conteúdo", operations: "Operação",
    data_performance: "Dados & Performance", artificial_intelligence: "IA",
    research_audience: "Pesquisa & Audiência",
  }[c] ?? c;
}

function JourneyDiagram() {
  const steps = [
    { icon: Users, label: "Entender", app: "Deepersona", desc: "Públicos, comportamentos e personas.", color: "var(--brand-deepersona)" },
    { icon: PenTool, label: "Planejar & criar", app: "Creator", desc: "Estratégia e produção de conteúdo com IA.", color: "var(--brand-creator)" },
    { icon: Layers, label: "Executar", app: "SoMA", desc: "Demandas, fluxos e entregas.", color: "var(--brand-soma)" },
    { icon: BarChart3, label: "Medir & evoluir", app: "LeKPI", desc: "Indicadores, resultados e aprendizado.", color: "var(--brand-lekpi)" },
  ];
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={i} className="relative rounded-xl border p-4 space-y-2"
                 style={{ background: `${s.color}08`, borderColor: `${s.color}30` }}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Etapa {i + 1}</div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: `${s.color}20`, color: s.color }}>
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.app}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
