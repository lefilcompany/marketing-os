import { type ReactNode, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar, SidebarContent, SidebarProvider, SidebarTrigger,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarFooter, SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Home, BookMarked, Users,
  Settings, Shield, ChevronDown, LogOut, User as UserIcon,
  Sparkles, Search, Menu, Bell,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import { MODULES } from "@/lib/modules";
import deePersonaLogo from "@/assets/deepersona-logo.png.asset.json";
import creatorLogo from "@/assets/creator-logo.png.asset.json";
import somaLogo from "@/assets/soma-logo.png.asset.json";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "@/components/notification-bell";
import { GuidedFlowBar } from "@/components/guided-flow-bar";

type Membership = {
  id: string;
  role: string;
  organization: { id: string; name: string; slug: string; logo_url: string | null; status: string; plan: string | null } | null;
};

type Props = {
  children: ReactNode;
  profile: { id: string; email: string | null; full_name: string | null; avatar_url: string | null } | null;
  memberships: Membership[];
  isSuperadmin: boolean;
};

export function AppShell({ children, profile, memberships, isSuperadmin }: Props) {
  const { currentOrgId, setCurrentOrgId } = useWorkspace();
  const currentMembership = memberships.find((m) => m.organization?.id === currentOrgId) ?? memberships[0];
  const canAdmin = currentMembership?.role === "org_admin" || isSuperadmin;
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full bg-background">
        <AppSidebar canAdmin={canAdmin} isSuperadmin={isSuperadmin} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopHeader
            profile={profile}
            memberships={memberships}
            currentMembership={currentMembership}
            onSwitch={(id) => setCurrentOrgId(id)}
            onOpenPalette={() => setPaletteOpen(true)}
          />
          <GuidedFlowBar />
          <main className="flex-1 min-w-0">
            {children}
          </main>
          <MobileNav canAdmin={canAdmin} />
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} isSuperadmin={isSuperadmin} canAdmin={canAdmin} />
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ isSuperadmin }: { canAdmin: boolean; isSuperadmin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const nav = [
    { to: "/dashboard", label: "Home", icon: Home },
    { to: "/dashboards", label: "Dashboards", icon: LayoutDashboard },
  ];
  const moduleSlugs = ["deepersona", "estrategia", "creator", "soma", "comunidades", "lekpis"];
  const modules = MODULES
    .filter((m) => moduleSlugs.includes(m.slug))
    .map((m) => ({ to: m.route, label: m.name, icon: m.icon, color: m.color }));
  const bibliotecaModule = MODULES.find((m) => m.slug === "biblioteca");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-hero flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display font-semibold text-[13px] leading-tight tracking-tight">Marketing OS</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">LeFil</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((it) => (
                <SidebarMenuItem key={it.label}>
                  <SidebarMenuButton asChild isActive={pathname === it.to}>
                    <Link to={it.to}><it.icon className="h-4 w-4" /><span>{it.label}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={pathname === it.to}>
                    <Link to={it.to}>
                      {it.to === "/deepersona" ? (
                        <img
                          src={deePersonaLogo.url}
                          alt="DeePersona"
                          className="h-3 w-auto object-contain"
                        />
                      ) : it.to === "/creator" ? (
                        <img
                          src={creatorLogo.url}
                          alt="Creator"
                          className="h-5 w-auto object-contain dark:invert"
                        />
                      ) : it.to === "/soma" ? (
                        <img
                          src={somaLogo.url}
                          alt="SoMA"
                          className="h-7 w-auto object-contain dark:invert"
                        />
                      ) : (
                        <>
                          <it.icon className="h-4 w-4" style={{ color: it.color }} />
                          <span>{it.label}</span>
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {bibliotecaModule && (
          <SidebarGroup>
            <SidebarGroupLabel>Biblioteca</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === bibliotecaModule.route}>
                    <Link to={bibliotecaModule.route}>
                      <BookMarked className="h-4 w-4" style={{ color: bibliotecaModule.color }} />
                      <span>{bibliotecaModule.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSuperadmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Marketing OS</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")}>
                    <Link to="/admin"><Shield className="h-4 w-4" /><span>Administração</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/configuracoes"}>
                  <Link to="/configuracoes"><Settings className="h-4 w-4" /><span>Configurações</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>


      <SidebarFooter className="border-t">
        {!collapsed && (
          <div className="px-2 py-1 text-[11px] text-muted-foreground">
            v1.0 · Marketing OS
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

function TopHeader({ profile, memberships, currentMembership, onSwitch, onOpenPalette }: {
  profile: Props["profile"];
  memberships: Membership[];
  currentMembership: Membership | undefined;
  onSwitch: (id: string) => void;
  onOpenPalette: () => void;
}) {
  const nav = useNavigate();
  const qc = useQueryClient();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || profile?.email || "?").slice(0, 2).toUpperCase();

  return (
    <header className="h-14 border-b bg-background/85 backdrop-blur-xl sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6">
      <SidebarTrigger className="hidden lg:flex text-muted-foreground hover:text-foreground" />
      <button className="lg:hidden" onClick={onOpenPalette} aria-label="Menu">
        <Menu className="h-5 w-5" />
      </button>

      {/* Workspace switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 max-w-[240px] h-9 px-2 rounded-lg hover:bg-accent">
            <div className="h-6 w-6 rounded-md bg-gradient-hero grid place-items-center text-white text-[11px] font-semibold shrink-0">
              {currentMembership?.organization?.name.slice(0, 1) ?? "?"}
            </div>
            <span className="truncate font-medium text-[13px]">{currentMembership?.organization?.name ?? "Sem workspace"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Seus workspaces</DropdownMenuLabel>
          {memberships.map((m) => m.organization && (
            <DropdownMenuItem key={m.id} onClick={() => onSwitch(m.organization!.id)}>
              <div className="flex items-center gap-2 w-full">
                <div className="h-6 w-6 rounded bg-muted grid place-items-center text-xs font-semibold">
                  {m.organization.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.organization.name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{m.role.replace("_", " ")}</div>
                </div>
                {m.organization.id === currentMembership?.organization?.id && (
                  <Badge variant="secondary" className="text-[10px]">Atual</Badge>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      <button
        onClick={onOpenPalette}
        className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/40 text-[13px] text-muted-foreground hover:bg-accent hover:border-accent transition-colors min-w-[280px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar…</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-border bg-background font-mono">⌘K</kbd>
      </button>

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full hover:bg-accent p-1 transition">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{profile?.full_name ?? "Sem nome"}</div>
            <div className="text-xs text-muted-foreground truncate">{profile?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => nav({ to: "/perfil" })}><UserIcon className="h-4 w-4 mr-2" />Meu perfil</DropdownMenuItem>
          <DropdownMenuItem onClick={() => nav({ to: "/configuracoes" })}><Settings className="h-4 w-4 mr-2" />Configurações</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function MobileNav({ canAdmin }: { canAdmin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/dashboard", label: "Início", icon: LayoutDashboard },
    { to: "/creator", label: "Creator", icon: Sparkles },
    { to: "/notificacoes", label: "Alertas", icon: Bell },
    { to: canAdmin ? "/equipe" : "/perfil", label: canAdmin ? "Equipe" : "Perfil", icon: canAdmin ? Users : UserIcon },
  ];
  return (
    <nav className="lg:hidden sticky bottom-0 z-30 border-t bg-surface/95 backdrop-blur">
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const active = pathname === it.to;
          return (
            <Link key={it.to} to={it.to} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <it.icon className="h-5 w-5" />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
