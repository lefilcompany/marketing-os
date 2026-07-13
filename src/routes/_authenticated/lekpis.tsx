import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ClienteAtivoProvider } from "@/contexts/cliente-ativo-context";
import { LekpisTopBar } from "@/components/lekpis/top-bar";

export const Route = createFileRoute("/_authenticated/lekpis")({
  head: () => ({ meta: [{ title: "LeKPIs — Marketing OS" }] }),
  component: LekpisLayout,
});

function LekpisLayout() {
  return (
    <ClienteAtivoProvider>
      <div className="lekpis-root min-h-[calc(100dvh-4rem)]">
        <LekpisTopBar />
        <main className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </ClienteAtivoProvider>
  );
}
