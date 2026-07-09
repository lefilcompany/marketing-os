import { Sparkles, Layers, BarChart3, Users, Brain, PenTool, Rocket, Activity } from "lucide-react";

const ICONS: Record<string, any> = {
  Sparkles, Layers, BarChart3, Users, Brain, PenTool, Rocket, Activity, Kanban: Layers,
};

export function AppIcon({ app, size = "md" }: { app: any; size?: "sm" | "md" }) {
  const Icon = ICONS[app.icon] ?? Sparkles;
  const s = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div
      className={`${s} rounded-lg grid place-items-center shrink-0`}
      style={{ background: `${app.accent_color ?? "var(--primary)"}18`, color: app.accent_color ?? "var(--primary)" }}
    >
      <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  );
}

export function categoryLabel(c: string) {
  return {
    strategy: "Estratégia",
    content: "Conteúdo",
    operations: "Operação",
    data_performance: "Dados & Performance",
    artificial_intelligence: "IA",
    research_audience: "Pesquisa & Audiência",
  }[c] ?? c;
}
