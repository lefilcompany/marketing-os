import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandLoading,
} from "@/components/ui/command";
import { getWorkspaceApps } from "@/lib/workspace.functions";
import { globalSearch, type SearchHit } from "@/lib/search.functions";
import { useWorkspace } from "@/lib/workspace-context";
import {
  LayoutDashboard, Grid3x3, Activity, Bell, Users, Inbox, Settings, Shield,
  ExternalLink, User, PenTool, Layers, BarChart3, Lightbulb, FolderKanban, CheckSquare,
} from "lucide-react";

const MODULE_META: Record<SearchHit["module"], { label: string; color: string }> = {
  deepersona: { label: "DeePersona", color: "var(--brand-deepersona)" },
  creator: { label: "Creator", color: "var(--brand-creator)" },
  soma: { label: "Soma", color: "var(--brand-soma)" },
  lekpis: { label: "LeKPIs", color: "var(--brand-lekpi)" },
};

function HitIcon({ kind }: { kind: string }) {
  const cls = "h-4 w-4";
  switch (kind) {
    case "persona": return <User className={cls} />;
    case "insight": return <Lightbulb className={cls} />;
    case "campaign": return <PenTool className={cls} />;
    case "project": return <FolderKanban className={cls} />;
    case "task": return <CheckSquare className={cls} />;
    case "kpi": return <BarChart3 className={cls} />;
    default: return <Layers className={cls} />;
  }
}

function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function CommandPalette({
  open, onOpenChange, isSuperadmin, canAdmin,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  isSuperadmin: boolean; canAdmin: boolean;
}) {
  const nav = useNavigate();
  const { currentOrgId } = useWorkspace();
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 220);

  const appsQ = useQuery({
    queryKey: ["ws-apps", currentOrgId],
    queryFn: () => getWorkspaceApps({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId && open,
  });

  const searchQ = useQuery({
    queryKey: ["global-search", currentOrgId, debounced],
    queryFn: () => globalSearch({ data: { organizationId: currentOrgId!, q: debounced } }),
    enabled: !!currentOrgId && open && debounced.length >= 2,
    staleTime: 15_000,
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

  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const go = (fn: () => void) => { onOpenChange(false); fn(); };

  const grouped = useMemo(() => {
    const g: Record<SearchHit["module"], SearchHit[]> = {
      deepersona: [], creator: [], soma: [], lekpis: [],
    };
    for (const h of searchQ.data?.hits ?? []) g[h.module].push(h);
    return g;
  }, [searchQ.data]);

  const hasResults = (searchQ.data?.hits.length ?? 0) > 0;
  const searching = debounced.length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar personas, campanhas, projetos, tarefas, KPIs, insights…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {searching && searchQ.isFetching && (
          <CommandLoading>Buscando…</CommandLoading>
        )}
        {!searching && <CommandEmpty>Digite para buscar em todos os módulos.</CommandEmpty>}
        {searching && !searchQ.isFetching && !hasResults && (
          <CommandEmpty>Nenhum resultado para "{debounced}".</CommandEmpty>
        )}

        {searching && hasResults && (
          <>
            {(Object.keys(grouped) as SearchHit["module"][]).map((mod) => {
              const items = grouped[mod];
              if (items.length === 0) return null;
              const meta = MODULE_META[mod];
              return (
                <CommandGroup key={mod} heading={meta.label}>
                  {items.map((h) => (
                    <CommandItem
                      key={`${h.module}:${h.kind}:${h.id}`}
                      value={`${meta.label} ${h.title} ${h.subtitle ?? ""} ${h.kind}`}
                      onSelect={() => go(() => nav({ to: h.route }))}
                    >
                      <span
                        className="grid h-6 w-6 place-items-center rounded-md text-white shrink-0"
                        style={{ background: `color-mix(in oklab, ${meta.color} 70%, transparent)` }}
                      >
                        <HitIcon kind={h.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{h.title}</div>
                        {h.subtitle && (
                          <div className="truncate text-[11px] text-muted-foreground">{h.subtitle}</div>
                        )}
                      </div>
                      <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                        {h.kind}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            <CommandSeparator />
          </>
        )}

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
              {appsQ.data.apps.map((a: { id: string; slug: string; name: string; category: string | null }) => (
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
