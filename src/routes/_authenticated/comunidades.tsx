import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/comunidades")({
  head: () => ({ meta: [{ title: "Comunidades — Marketing OS" }] }),
  component: () => <ModuleShell module={getModule("comunidades")!} />,
});
