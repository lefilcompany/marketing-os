import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Marketing OS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Preferências do workspace atual.</p>
      </div>
      <Card><CardContent className="p-6">
        <p className="text-sm text-muted-foreground">
          Personalizações avançadas (identidade visual da empresa, políticas de segurança, integrações e SSO) serão
          disponibilizadas em breve conforme cada workspace evoluir.
        </p>
      </CardContent></Card>
    </div>
  );
}
