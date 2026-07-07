import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import { adminOverview } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Building2, LayoutGrid, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — Marketing OS" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const boot = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!boot.data) return null;
  if (!boot.data.isSuperadmin) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-2">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Acesso restrito a superadministradores.</p>
      </div>
    );
  }

  const nav = [
    { to: "/admin", label: "Visão geral", icon: Shield },
    { to: "/admin/empresas", label: "Empresas", icon: Building2 },
    { to: "/admin/aplicacoes", label: "Aplicações", icon: LayoutGrid },
    { to: "/admin/comunicados", label: "Comunicados", icon: Megaphone },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-semibold">Administração do Marketing OS</h1>
      </div>
      <div className="flex gap-1 border-b overflow-x-auto">
        {nav.map((n) => (
          <Link key={n.to} to={n.to}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${pathname === n.to ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        ))}
      </div>
      {pathname === "/admin" ? <AdminOverview /> : <Outlet />}
    </div>
  );
}

function AdminOverview() {
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminOverview() });
  const d = q.data;
  const items = [
    { label: "Empresas", value: d?.totalOrgs, sub: `${d?.activeOrgs ?? 0} ativas · ${d?.suspendedOrgs ?? 0} suspensas` },
    { label: "Usuários", value: d?.totalUsers },
    { label: "Acessos a aplicações", value: d?.totalAppOpens },
    { label: "Solicitações pendentes", value: d?.pendingRequests },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label}><CardContent className="p-5">
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className="font-display text-3xl font-semibold mt-1">{it.value ?? "—"}</div>
          {it.sub && <div className="text-[11px] text-muted-foreground mt-1">{it.sub}</div>}
        </CardContent></Card>
      ))}
    </div>
  );
}
