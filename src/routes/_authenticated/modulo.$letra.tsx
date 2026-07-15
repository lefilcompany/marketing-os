import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AEIOU_MODULES, type AeiouLetter } from "@/lib/aeiou-modules";
import { listToolBrands } from "@/lib/tool-brand.functions";
import { ToolCard } from "@/components/tool-card";
import { ArrowLeft } from "lucide-react";

const VALID: AeiouLetter[] = ["A", "E", "I", "O", "U"];

export const Route = createFileRoute("/_authenticated/modulo/$letra")({
  beforeLoad: ({ params }) => {
    const l = params.letra.toUpperCase();
    if (!VALID.includes(l as AeiouLetter)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: ({ params }) => {
    const l = params.letra.toUpperCase();
    const mod = AEIOU_MODULES.find((m) => m.letter === l);
    return {
      meta: [
        {
          title: mod
            ? `Módulo ${mod.letter} — ${mod.name} · Marketing OS`
            : "Módulo — Marketing OS",
        },
      ],
    };
  },
  component: ModulePage,
});

function ModulePage() {
  const { letra } = Route.useParams();
  const letter = letra.toUpperCase() as AeiouLetter;
  const mod = AEIOU_MODULES.find((m) => m.letter === letter)!;

  const brands = useQuery({
    queryKey: ["tool-brands"],
    queryFn: () => listToolBrands(),
  });
  const brandMap = brands.data?.brands ?? {};

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F6F9FC]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8 lg:py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para módulos
        </Link>

        <header className="mb-8 flex items-center gap-4">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl font-semibold text-white shadow-md"
            style={{ background: mod.color }}
          >
            {mod.letter}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-semibold">
              Módulo {mod.letter}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {mod.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {mod.tagline}
            </p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mod.tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              initialBrand={brandMap[tool.id] ?? ""}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
