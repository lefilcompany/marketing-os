import { createFileRoute } from "@tanstack/react-router";
import { getModule } from "@/lib/modules";
import { ModulePlatformShell } from "@/components/module-platform-shell";
import { McpOAuthPanel } from "@/components/mcp-oauth-panel";

export const Route = createFileRoute("/_authenticated/deepersona")({
  head: () => ({ meta: [{ title: "DeePersona — Marketing OS" }] }),
  component: DeePersonaIndex,
});

function DeePersonaIndex() {
  const mod = getModule("deepersona")!;
  return (
    <>
      <ModulePlatformShell module={mod} />
      <McpOAuthPanel provider="deepersona" />
    </>
  );
}
