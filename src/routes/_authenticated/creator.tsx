import { createFileRoute } from "@tanstack/react-router";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/creator")({
  head: () => ({ meta: [{ title: "Creator — Marketing OS" }] }),
  component: CreatorPage,
});

function CreatorPage() {
  const mod = getModule("creator")!;
  return (
    <div>
      <ModulePlatformShell module={mod} />
      <ModuleShell module={mod} />
    </div>
  );
}
