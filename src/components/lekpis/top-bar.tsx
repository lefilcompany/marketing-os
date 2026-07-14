import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Home, Plug, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClienteSelector } from "./cliente-selector";
import { useProfile } from "@/hooks/use-lekpis-queries";

const TABS = [
  { to: "/lekpis", label: "Home", icon: Home, exact: true },
  { to: "/lekpis/integracoes", label: "Integrações", icon: Plug, exact: false },
  { to: "/lekpis/perfil", label: "Perfil", icon: UserRound, exact: false },
];

export function LekpisTopBar() {
  const { data: profile } = useProfile();
  const pathname = useLocation({ select: (l: { pathname: string }) => l.pathname });
  const nome = profile?.nome ?? "";
  const first = nome ? nome.split(" ")[0] : "";
  const initials = (nome || "L")
    .split(" ")
    .filter((s: string) => s.length > 0)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase();

  return (
    <header className="lekpis-topbar">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/lekpis" className="flex items-center gap-2.5 group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[oklch(0.2_0.03_260)] text-[oklch(0.99_0.005_90)]">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="lekpis-display text-sm font-semibold">LeKPIs</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {first ? `Olá, ${first}` : "Dashboard simples"}
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[oklch(0.96_0.005_80)] text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ClienteSelector />
          <Avatar className="h-8 w-8 border border-black/5">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
