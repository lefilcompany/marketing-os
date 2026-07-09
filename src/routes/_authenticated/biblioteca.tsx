import { createFileRoute } from "@tanstack/react-router";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca — Marketing OS" }] }),
  component: () => <ModuleShell module={getModule("biblioteca")!} />,
});
