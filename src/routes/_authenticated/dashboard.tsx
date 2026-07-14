import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import { listToolBrands } from "@/lib/tool-brand.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { AEIOU_MODULES, type AeiouModule } from "@/lib/aeiou-modules";
import { ToolCard } from "@/components/tool-card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Marketing OS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { currentOrgId } = useWorkspace();
  const boot = useQuery({
    queryKey: ["session-bootstrap"],
    queryFn: () => getSessionBootstrap(),
  });
  const brands = useQuery({
    queryKey: ["tool-brands"],
    queryFn: () => listToolBrands(),
  });

  const firstName =
    (boot.data?.profile?.full_name ?? "").split(" ")[0] || "colega";
  const orgName = boot.data?.memberships.find(
    (m) => m.organization?.id === currentOrgId,
  )?.organization?.name;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F6F9FC]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-12">
        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Marketing OS · LeFil{orgName ? ` · ${orgName}` : ""}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-foreground">
            Olá, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            Seus módulos <span className="font-semibold">A · E · I · O · U</span> —
            ambiente, estratégia, interações, operações e unificação. Configure a
            marca de cada ferramenta e conecte os MCPs à medida em que ficarem
            disponíveis.
          </p>
        </header>

        <div className="space-y-10">
          {AEIOU_MODULES.map((mod) => (
            <ModuleSection
              key={mod.letter}
              module={mod}
              brands={brands.data?.brands ?? {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleSection({
  module: mod,
  brands,
}: {
  module: AeiouModule;
  brands: Record<string, string>;
}) {
  return (
    <section aria-labelledby={`mod-${mod.letter}`}>
      <div className="flex items-center gap-4 mb-5">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl font-display text-xl font-semibold text-white shadow-md"
          style={{ background: mod.color }}
        >
          {mod.letter}
        </div>
        <div>
          <h2
            id={`mod-${mod.letter}`}
            className="font-display text-xl font-semibold leading-tight"
          >
            Módulo {mod.letter} — {mod.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{mod.tagline}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mod.tools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            initialBrand={brands[tool.id] ?? ""}
          />
        ))}
      </div>
    </section>
  );
}
