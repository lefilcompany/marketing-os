import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFullCatalog } from "@/lib/workspace.functions";
import { resolveAppRedirect, requestAccess } from "@/lib/applications.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppIcon, categoryLabel } from "@/components/app-icon";
import { ArrowLeft, ExternalLink, Lock, LifeBuoy, Users, PenTool, Layers, BarChart3, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/aplicacoes/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Marketing OS` }] }),
  component: AppDetail,
});

function AppDetail() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { currentOrgId } = useWorkspace();
  const [reasoning, setReasoning] = useState(false);

  const q = useQuery({
    queryKey: ["catalog", currentOrgId],
    queryFn: () => getFullCatalog({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const app = q.data?.apps.find((a: any) => a.slug === slug);

  const openM = useMutation({
    mutationFn: () => resolveAppRedirect({ data: { organizationId: currentOrgId!, applicationId: app!.id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["recent", currentOrgId] });
      if (r.openMode === "same_tab") window.location.href = r.url;
      else window.open(r.url, "_blank", "noopener,noreferrer");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const req = useMutation({
    mutationFn: () => requestAccess({ data: { organizationId: currentOrgId!, applicationId: app!.id } }),
    onSuccess: () => { toast.success("Solicitação enviada."); setReasoning(false); },
    onError: (e: any) => toast.error(e.message),
  });

  if (q.isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  if (!app) return (
    <div className="p-8 max-w-3xl mx-auto">
      <p className="text-sm text-muted-foreground">Aplicação não encontrada.</p>
      <Button variant="link" onClick={() => nav({ to: "/aplicacoes" })}>Voltar ao catálogo</Button>
    </div>
  );

  const features = Array.isArray(app.features) ? app.features : [];
  const journey = [
    { icon: Users, label: "Deepersona", desc: "Entender o público" },
    { icon: PenTool, label: "Creator", desc: "Planejar e criar" },
    { icon: Layers, label: "SoMA", desc: "Executar" },
    { icon: BarChart3, label: "LeKPI", desc: "Medir" },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <button onClick={() => nav({ to: "/aplicacoes" })} className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="rounded-2xl p-6 lg:p-8 border relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${app.accent_color}10, transparent)` }}>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <AppIcon app={app} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-3xl font-semibold">{app.name}</h1>
              <Badge variant="outline">{categoryLabel(app.category)}</Badge>
              {!app.included && <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Não incluído</Badge>}
            </div>
            <p className="text-muted-foreground">{app.short_description}</p>
            <div className="flex gap-2 pt-2">
              {app.included ? (
                <Button onClick={() => openM.mutate()}><ExternalLink className="h-4 w-4" />Abrir {app.name}</Button>
              ) : (
                <Button onClick={() => req.mutate()} disabled={req.isPending}>Solicitar acesso</Button>
              )}
              {app.support_url && (
                <Button variant="outline" asChild><a href={app.support_url} target="_blank" rel="noopener noreferrer"><LifeBuoy className="h-4 w-4" />Suporte</a></Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Sobre a plataforma</h2>
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{app.full_description || app.short_description}</p>
            </div>
            {features.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mt-4">Principais funcionalidades</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {(features as unknown as string[]).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full mt-2 shrink-0" style={{ background: app.accent_color ?? undefined }} />
                      {String(f)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {app.benefits && (
              <div>
                <h3 className="font-semibold text-sm mt-4">Benefício principal</h3>
                <p className="text-sm text-muted-foreground mt-1">{app.benefits}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card><CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-sm">Status operacional</h3>
            <div className="text-sm capitalize">{app.status.replace("_", " ")}</div>
            <h3 className="font-semibold text-sm pt-2">Modo de conexão</h3>
            <div className="text-sm">{app.connection_mode === "external_link" ? "Link externo" : app.connection_mode === "authenticated_link" ? "Link autenticado" : "SSO"}</div>
            <h3 className="font-semibold text-sm pt-2">Modo de abertura</h3>
            <div className="text-sm">{app.open_mode === "new_tab" ? "Nova aba" : "Mesma aba"}</div>
          </CardContent></Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Como essa plataforma se conecta ao Marketing OS</h2>
          <p className="text-sm text-muted-foreground">
            Cada solução da LeFil é um módulo especializado de um ciclo integrado de marketing.
          </p>
          <div className="grid md:grid-cols-4 gap-3 pt-2">
            {journey.map((s, i) => {
              const isMe = s.label.toLowerCase() === app.name.toLowerCase();
              return (
                <div key={i} className={`rounded-lg border p-3 space-y-1 ${isMe ? "ring-2 ring-primary" : ""}`}>
                  <s.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {reasoning && null}
    </div>
  );
}
