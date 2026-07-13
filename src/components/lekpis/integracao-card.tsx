import { useState } from "react";
import { Instagram, Facebook, Target, Plug, CheckCircle2, Loader2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LekpisPlatform } from "@/hooks/use-lekpis-connect";
import type { Integracao } from "@/hooks/use-lekpis-queries";

const META: Record<LekpisPlatform, { label: string; icon: any; accent: string }> = {
  instagram: { label: "Instagram", icon: Instagram, accent: "oklch(0.68 0.19 20)" },
  facebook: { label: "Facebook", icon: Facebook, accent: "oklch(0.55 0.17 260)" },
  meta_ads: { label: "Meta Ads", icon: Target, accent: "oklch(0.65 0.18 200)" },
};

export function IntegracaoCard({
  platform,
  integracao,
  onConnect,
  onDisconnect,
  disconnecting,
}: {
  platform: LekpisPlatform;
  integracao: Integracao | null;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
  disconnecting?: boolean;
}) {
  const meta = META[platform];
  const Icon = meta.icon;
  const conta = integracao?.account_name ?? integracao?.conta ?? null;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const connected = !!integracao;

  return (
    <div className="lekpis-card">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-xl border border-black/5"
          style={{ background: `color-mix(in oklab, ${meta.accent} 18%, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color: meta.accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="lekpis-display font-semibold">{meta.label}</h3>
          {connected ? (
            <p className="text-xs text-muted-foreground truncate">{conta ?? "Conectado"}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Não conectado</p>
          )}
        </div>
        {connected && (
          <CheckCircle2 className="h-4 w-4 text-[oklch(0.6_0.16_145)]" />
        )}
      </div>

      <div className="mt-5 flex items-center gap-2">
        {connected ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setConfirmOpen(true)}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5" />
              )}
              Desconectar
            </Button>
            <Button size="sm" variant="ghost" onClick={onConnect}>
              Reconectar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onConnect} className="gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            Conectar
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar {meta.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Você perderá o acesso aos KPIs desta plataforma até reconectar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => integracao && onDisconnect(integracao.id)}
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
