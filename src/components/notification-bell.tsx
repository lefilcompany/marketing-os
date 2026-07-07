import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { listNotifications, markNotificationRead } from "@/lib/notifications.functions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const items = q.data?.items ?? [];
  const unread = items.filter((n) => !n.read_at);

  const markAll = useMutation({
    mutationFn: () => markNotificationRead({ data: { all: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-[10px]">
              {unread.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-semibold text-sm">Notificações</div>
          {unread.length > 0 && (
            <button onClick={() => markAll.mutate()} className="text-xs text-muted-foreground hover:text-foreground">
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma notificação.</div>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => { if (n.action_url) nav({ to: n.action_url as any }); }}
              className={`w-full text-left p-3 border-b hover:bg-accent transition ${!n.read_at ? "bg-accent/40" : ""}`}
            >
              <div className="flex items-start gap-2">
                <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${!n.read_at ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
