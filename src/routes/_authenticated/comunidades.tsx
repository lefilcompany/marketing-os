import { createFileRoute } from "@tanstack/react-router";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/comunidades")({
  head: () => ({ meta: [{ title: "Comunidades — Marketing OS" }] }),
  component: ComunidadesPage,
});

function ComunidadesPage() {
  const mod = getModule("comunidades")!;
  return (
    <div>
      <ModulePlatformShell module={mod} />
      <ModuleShell module={mod} />
    </div>
  );
}
