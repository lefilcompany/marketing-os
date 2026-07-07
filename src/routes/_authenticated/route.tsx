import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import { bootstrapFirstSuperadmin } from "@/lib/bootstrap.functions";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { AppShell } from "@/components/app-shell";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { userId: data.user.id };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const nav = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const [bootstrapped, setBootstrapped] = useState(false);

  const bootstrapQ = useQuery({
    queryKey: ["session-bootstrap"],
    queryFn: () => getSessionBootstrap(),
  });

  // Se o usuário não tem nenhuma organização E também não é superadmin,
  // tenta o bootstrap automático (só terá efeito se ele for o 1º usuário).
  useEffect(() => {
    if (bootstrapped) return;
    if (bootstrapQ.isLoading || !bootstrapQ.data) return;
    const { memberships, isSuperadmin } = bootstrapQ.data;
    if (memberships.length === 0 && !isSuperadmin) {
      setBootstrapped(true);
      bootstrapFirstSuperadmin().then((r) => {
        if (r.promoted) {
          qc.invalidateQueries();
          router.invalidate();
        }
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrapQ.data, bootstrapQ.isLoading]);

  const initialOrgId = useMemo(() => {
    const memberships = bootstrapQ.data?.memberships ?? [];
    if (memberships.length === 0) return null;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("mos:current-org");
      if (stored && memberships.some((m) => m.organization?.id === stored)) return stored;
    }
    return memberships[0]?.organization?.id ?? null;
  }, [bootstrapQ.data]);

  if (bootstrapQ.isLoading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bootstrapQ.data) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <p className="text-sm text-muted-foreground">Não foi possível carregar sua sessão.</p>
      </div>
    );
  }

  const { memberships, isSuperadmin, profile } = bootstrapQ.data;

  if (memberships.length === 0 && !isSuperadmin) {
    return (
      <div className="min-h-dvh grid place-items-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl font-semibold">Aguardando convite</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta está criada, mas ainda não foi vinculada a nenhuma empresa. Peça a um administrador para convidá-lo, ou fale com o suporte da LeFil.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}
            className="text-sm underline text-muted-foreground"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceProvider initialOrgId={initialOrgId}>
      <AppShell
        profile={profile}
        memberships={memberships}
        isSuperadmin={isSuperadmin}
      >
        <Outlet />
      </AppShell>
    </WorkspaceProvider>
  );
}
