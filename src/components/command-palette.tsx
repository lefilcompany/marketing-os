import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { getWorkspaceApps } from "@/lib/workspace.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { LayoutDashboard, Grid3x3, Activity, Bell, Users, Inbox, Settings, Shield, ExternalLink } from "lucide-react";

export function CommandPalette({
  open, onOpenChange, isSuperadmin, canAdmin,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  isSuperadmin: boolean; canAdmin: boolean;
}) {
  const nav = useNavigate();
  const { currentOrgId } = useWorkspace();
  const appsQ = useQuery({
    queryKey: ["ws-apps", currentOrgId],
    queryFn: () => getWorkspaceApps({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId && open,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (fn: () => void) => { onOpenChange(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar plataformas, páginas ou ações…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>

        <CommandGroup heading="Navegar">
          <CommandItem onSelect={() => go(() => nav({ to: "/dashboard" }))}><LayoutDashboard className="h-4 w-4" /> Visão geral</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/aplicacoes" }))}><Grid3x3 className="h-4 w-4" /> Aplicações</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/atividades" }))}><Activity className="h-4 w-4" /> Atividades</CommandItem>
          <CommandItem onSelect={() => go(() => nav({ to: "/notificacoes" }))}><Bell className="h-4 w-4" /> Notificações</CommandItem>
          {canAdmin && <>
            <CommandItem onSelect={() => go(() => nav({ to: "/equipe" }))}><Users className="h-4 w-4" /> Equipe</CommandItem>
            <CommandItem onSelect={() => go(() => nav({ to: "/solicitacoes" }))}><Inbox className="h-4 w-4" /> Solicitações</CommandItem>
          </>}
          {isSuperadmin && (
            <CommandItem onSelect={() => go(() => nav({ to: "/admin" }))}><Shield className="h-4 w-4" /> Administração</CommandItem>
          )}
          <CommandItem onSelect={() => go(() => nav({ to: "/configuracoes" }))}><Settings className="h-4 w-4" /> Configurações</CommandItem>
        </CommandGroup>

        {appsQ.data && appsQ.data.apps.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Aplicações">
              {appsQ.data.apps.map((a: any) => (
                <CommandItem key={a.id} onSelect={() => go(() => nav({ to: "/aplicacoes/$slug", params: { slug: a.slug } }))}>
                  <ExternalLink className="h-4 w-4" />
                  {a.name}
                  <span className="ml-auto text-xs text-muted-foreground">{a.category}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
