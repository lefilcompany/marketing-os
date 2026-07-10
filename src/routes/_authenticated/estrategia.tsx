import { createFileRoute } from "@tanstack/react-router";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/estrategia")({
  head: () => ({ meta: [{ title: "Estratégia — Marketing OS" }] }),
  component: EstrategiaPage,
});

function EstrategiaPage() {
  const mod = getModule("estrategia")!;
  return (
    <div>
      <ModulePlatformShell module={mod} />
      <ModuleShell module={mod} />
    </div>
  );
}
