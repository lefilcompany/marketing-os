import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAccessRequests, decideAccessRequest } from "@/lib/team.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/solicitacoes")({
  head: () => ({ meta: [{ title: "Solicitações — Marketing OS" }] }),
  component: RequestsPage,
});

function RequestsPage() {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["requests", currentOrgId],
    queryFn: () => listAccessRequests({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const decide = useMutation({
    mutationFn: (v: { requestId: string; decision: "approved" | "rejected" }) => decideAccessRequest({ data: v }),
    onSuccess: () => { toast.success("Decisão registrada."); qc.invalidateQueries({ queryKey: ["requests", currentOrgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const items = q.data?.items ?? [];
  const pending = items.filter((r: any) => r.status === "pending");
  const past = items.filter((r: any) => r.status !== "pending");

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Solicitações de acesso</h1>
        <p className="text-sm text-muted-foreground mt-1">Aprove ou recuse pedidos de acesso a aplicações.</p>
      </div>

      <Section title={`Pendentes (${pending.length})`}>
        {pending.length === 0 ? (
          <EmptyPanel icon={Inbox} label="Nenhuma solicitação pendente." />
        ) : pending.map((r: any) => (
          <RequestRow key={r.id} r={r}
            actions={<>
              <Button size="sm" variant="outline" onClick={() => decide.mutate({ requestId: r.id, decision: "rejected" })}>Recusar</Button>
              <Button size="sm" onClick={() => decide.mutate({ requestId: r.id, decision: "approved" })}>Aprovar</Button>
            </>}
          />
        ))}
      </Section>

      <Section title="Histórico">
        {past.length === 0 ? <EmptyPanel icon={Inbox} label="Sem histórico ainda." /> : past.map((r: any) => (
          <RequestRow key={r.id} r={r} actions={<Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status === "approved" ? "Aprovada" : r.status === "rejected" ? "Recusada" : r.status}</Badge>} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-2">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <Card><CardContent className="p-0 divide-y">{children}</CardContent></Card>
    </div>
  );
}

function EmptyPanel({ icon: Icon, label }: any) {
  return (
    <div className="p-8 text-center">
      <Icon className="h-6 w-6 mx-auto text-muted-foreground" />
      <p className="text-sm text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

function RequestRow({ r, actions }: any) {
  return (
    <div className="p-4 flex items-center gap-3">
      <Avatar className="h-9 w-9"><AvatarImage src={r.profile?.avatar_url ?? undefined} /><AvatarFallback>{(r.profile?.full_name ?? "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
      <div className="flex-1">
        <div className="text-sm">
          <span className="font-medium">{r.profile?.full_name ?? r.profile?.email}</span>
          <span className="text-muted-foreground"> pediu acesso a </span>
          <span className="font-medium">{r.application?.name ?? "aplicação"}</span>
        </div>
        {r.reason && <div className="text-xs text-muted-foreground mt-1 italic">"{r.reason}"</div>}
        <div className="text-[11px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}</div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
