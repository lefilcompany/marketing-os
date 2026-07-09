import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/lekpis")({
  head: () => ({ meta: [{ title: "LeKPIs — Marketing OS" }] }),
  component: () => <ModuleShell module={getModule("lekpis")!} />,
});
