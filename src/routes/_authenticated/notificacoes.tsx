import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markNotificationRead } from "@/lib/notifications.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — Marketing OS" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markNotificationRead({ data: { all: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = q.data?.items ?? [];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Notificações</h1>
          <p className="text-sm text-muted-foreground mt-1">Atualizações do Marketing OS.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
          <Check className="h-4 w-4" /> Marcar todas
        </Button>
      </div>
      <Card><CardContent className="p-0">
        {items.length === 0 && (
          <div className="p-10 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Sem notificações no momento.</p>
          </div>
        )}
        <div className="divide-y">
          {items.map((n) => (
            <div key={n.id} className={`p-4 flex items-start gap-3 ${!n.read_at ? "bg-accent/30" : ""}`}>
              <div className={`h-2 w-2 rounded-full mt-2 ${!n.read_at ? "bg-primary" : "bg-transparent"}`} />
              <div className="flex-1">
                <div className="text-sm font-medium">{n.title}</div>
                {n.message && <div className="text-sm text-muted-foreground mt-0.5">{n.message}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
              {!n.read_at && (
                <Button size="sm" variant="ghost" onClick={() => markOne.mutate(n.id)}>Marcar</Button>
              )}
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}
