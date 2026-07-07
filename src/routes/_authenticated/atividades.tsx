import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listActivities } from "@/lib/notifications.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity } from "lucide-react";
import { getSessionBootstrap } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/atividades")({
  head: () => ({ meta: [{ title: "Atividades — Marketing OS" }] }),
  component: ActivitiesPage,
});

const EVENT_LABEL: Record<string, string> = {
  login: "Login", logout: "Logout", app_open: "Aplicação aberta",
  app_open_denied: "Acesso negado", access_requested: "Acesso solicitado",
  access_approved: "Acesso aprovado", access_rejected: "Acesso recusado",
  invite_sent: "Convite enviado", invite_accepted: "Convite aceito",
  invite_cancelled: "Convite cancelado", role_changed: "Função alterada",
  app_granted: "Aplicação liberada", app_revoked: "Aplicação revogada",
  org_created: "Empresa criada", org_updated: "Empresa atualizada",
  org_suspended: "Empresa suspensa", org_activated: "Empresa reativada",
  app_created: "Aplicação criada", app_updated: "Aplicação atualizada",
  app_status_changed: "Status da aplicação alterado",
  settings_updated: "Configurações atualizadas",
};

function ActivitiesPage() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const membership = boot.data?.memberships.find((m: any) => m.organization?.id === currentOrgId);
  const canOrg = membership?.role === "org_admin" || boot.data?.isSuperadmin;
  const canGlobal = boot.data?.isSuperadmin;
  const [scope, setScope] = useState<"me" | "org" | "global">("me");

  const q = useQuery({
    queryKey: ["activities", scope, currentOrgId],
    queryFn: () => listActivities({ data: { scope, organizationId: currentOrgId ?? undefined } }),
    enabled: !!currentOrgId,
  });

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Atividades</h1>
        <p className="text-sm text-muted-foreground mt-1">Histórico de eventos.</p>
      </div>

      <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
        <TabsList>
          <TabsTrigger value="me">Minhas</TabsTrigger>
          {canOrg && <TabsTrigger value="org">Empresa</TabsTrigger>}
          {canGlobal && <TabsTrigger value="global">Global</TabsTrigger>}
        </TabsList>
        <TabsContent value={scope} className="mt-4">
          <Card><CardContent className="p-0">
            {q.isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>}
            {q.data && q.data.items.length === 0 && (
              <div className="p-10 text-center">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-3">Sem atividades ainda.</p>
              </div>
            )}
            <div className="divide-y">
              {q.data?.items.map((it: any) => (
                <div key={it.id} className="p-4 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full" style={{ background: it.application?.accent_color ?? "var(--muted-foreground)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{EVENT_LABEL[it.event_type] ?? it.event_type}</span>
                      {it.application?.name && <span className="text-muted-foreground"> · {it.application.name}</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {format(new Date(it.created_at), "dd 'de' MMM yyyy · HH:mm", { locale: ptBR })} · {formatDistanceToNow(new Date(it.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
