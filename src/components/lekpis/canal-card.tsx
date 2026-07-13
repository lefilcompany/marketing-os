import { Instagram, Facebook, Target, TrendingUp, TrendingDown, Plug, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { LekpisPlatform } from "@/hooks/use-lekpis-connect";

type Slug = "instagram" | "facebook" | "meta-ads" | "google-ads";

const META: Record<Slug, {
  label: string;
  icon: any;
  accent: string;
  platform?: LekpisPlatform;
}> = {
  instagram: { label: "Instagram", icon: Instagram, accent: "oklch(0.68 0.19 20)", platform: "instagram" },
  facebook: { label: "Facebook", icon: Facebook, accent: "oklch(0.55 0.17 260)", platform: "facebook" },
  "meta-ads": { label: "Meta Ads", icon: Target, accent: "oklch(0.65 0.18 200)", platform: "meta_ads" },
  "google-ads": { label: "Google Ads", icon: Sparkles, accent: "oklch(0.75 0.14 65)" },
};

export function CanalCard({
  slug,
  connected,
  loading,
  headline,
  headlineLabel,
  deltaPct,
  comingSoon,
  onConnect,
}: {
  slug: Slug;
  connected: boolean;
  loading?: boolean;
  headline?: string | null;
  headlineLabel?: string;
  deltaPct?: number | null;
  comingSoon?: boolean;
  onConnect?: () => void;
}) {
  const meta = META[slug];
  const Icon = meta.icon;

  const deltaVisible = typeof deltaPct === "number" && Number.isFinite(deltaPct);
  const positive = (deltaPct ?? 0) >= 0;

  return (
    <div className="lekpis-card group relative overflow-hidden">
      <div
        className="absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-60 -translate-y-8 translate-x-8"
        style={{ background: meta.accent }}
      />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/5"
            style={{ background: `color-mix(in oklab, ${meta.accent} 18%, transparent)` }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.accent }} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {headlineLabel ?? "Canal"}
            </p>
            <h3 className="lekpis-display text-base font-semibold leading-tight">
              {meta.label}
            </h3>
          </div>
        </div>
        {comingSoon && (
          <span className="text-[10px] uppercase tracking-widest rounded-full border px-2 py-0.5 text-muted-foreground">
            Em breve
          </span>
        )}
      </div>

      <div className="relative mt-6">
        {comingSoon ? (
          <p className="text-sm text-muted-foreground">
            Chegando em breve nesta plataforma.
          </p>
        ) : !connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Não conectado. Ligue esta plataforma para ver seus indicadores.
            </p>
            <Button size="sm" onClick={onConnect} className="gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              Conectar {meta.label}
            </Button>
          </div>
        ) : loading ? (
          <div className="lekpis-shimmer h-10 w-32 rounded-md" />
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="lekpis-num text-4xl font-semibold tracking-tight">
                {headline ?? "—"}
              </span>
              {deltaVisible && (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                  style={{
                    background: positive ? "oklch(0.94 0.06 145)" : "oklch(0.94 0.06 25)",
                    color: positive ? "oklch(0.4 0.14 145)" : "oklch(0.45 0.16 25)",
                  }}
                >
                  {positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(deltaPct as number).toFixed(1)}%
                </span>
              )}
            </div>
            <Link
              to="/lekpis/canal/$slug"
              params={{ slug }}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Ver detalhes →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
