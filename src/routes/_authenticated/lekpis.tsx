import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lekpis")({
  head: () => ({
    meta: [
      { title: "LeKPIs — em reformulação" },
      {
        name: "description",
        content: "O módulo LeKPIs está sendo reformulado. Em breve, novas integrações.",
      },
    ],
  }),
  component: LekpisPlaceholder,
});

function LekpisPlaceholder() {
  return (
    <div className="min-h-[calc(100dvh-4rem)] grid place-items-center px-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border bg-muted">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          LeKPIs em reformulação
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As integrações antigas foram removidas. Um novo MCP está sendo preparado
          e voltará em breve.
        </p>
      </div>
    </div>
  );
}
