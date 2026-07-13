import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { callLekpis } from "@/lib/lekpis-client";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import { toast } from "sonner";


export type LekpisPlatform = "instagram" | "facebook" | "meta_ads";

/**
 * Abre popup de OAuth do LeKPIs para conectar uma plataforma.
 * A callback `/api/mcp/callback` faz window.opener.postMessage({type:'mcp:connected', provider}) same-origin.
 * Também aceitamos postMessage do domínio real do LeKPIs (pla.lekpis.lefil.com.br) quando disponível.
 */
export function useLekpisConnect() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { clienteId } = useClienteAtivo();
  const handlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => () => {
    if (handlerRef.current) {
      window.removeEventListener("message", handlerRef.current);
      handlerRef.current = null;
    }
  }, []);

  return useCallback(
    async (platform: LekpisPlatform, clienteIdArg?: string | null) => {
      // Abre o popup IMEDIATAMENTE (dentro do gesto do usuário) para não ser bloqueado.
      const popup = window.open("about:blank", "lekpis-connect", "width=600,height=720");
      if (!popup) {
        toast.error("Popup bloqueado. Habilite popups para este site.");
        return;
      }

      let effectiveClienteId = clienteIdArg ?? clienteId ?? null;
      if (!effectiveClienteId) {
        effectiveClienteId = await ensureDefault();
      }
      if (!effectiveClienteId) {
        popup.close();
        toast.error("Nenhum cliente ativo. Crie um em Perfil antes de conectar.", {
          action: {
            label: "Ir para Perfil",
            onClick: () => void navigate({ to: "/lekpis/perfil" }),
          },
        });
        return;
      }


      let url: string | undefined;
      try {
        const res = await callLekpis<{ url?: string; items?: Array<{ url: string }> }>(
          "integracao.get_connect_url",
          { platform, cliente_id: effectiveClienteId },
        );
        url = res?.url ?? res?.items?.[0]?.url;
      } catch (e) {
        console.error("[lekpis] integracao.get_connect_url falhou:", e);
        popup.close();
        toast.error((e as Error).message ?? "Falha ao obter URL de conexão.");
        return;
      }
      if (!url) {
        console.error("[lekpis] integracao.get_connect_url sem URL. platform=", platform);
        popup.close();
        toast.error("URL de conexão não retornada pelo LeKPIs.");
        return;
      }

      try {
        popup.location.href = url;
      } catch (e) {
        console.error("[lekpis] falha ao setar popup.location:", e);
        // Fallback: reabrir com a URL final.
        window.open(url, "lekpis-connect", "width=600,height=720");
      }

      if (handlerRef.current) window.removeEventListener("message", handlerRef.current);
      const handler = (e: MessageEvent) => {
        const okOrigin =
          e.origin === window.location.origin ||
          e.origin === "https://pla.lekpis.lefil.com.br";
        if (!okOrigin) return;
        const data = e.data as { type?: string; provider?: string } | null;
        if (
          data?.type === "lekpis:connected" ||
          (data?.type === "mcp:connected" && data.provider === "lekpis")
        ) {
          qc.invalidateQueries({ queryKey: ["lekpis", "integracao.list"] });
          qc.invalidateQueries({ queryKey: ["lekpis"] });
          toast.success(`${labelFor(platform)} conectado.`);
          try {
            popup?.close();
          } catch {
            /* noop */
          }
          window.removeEventListener("message", handler);
          handlerRef.current = null;
        }
      };
      handlerRef.current = handler;
      window.addEventListener("message", handler);
    },
    [qc, clienteId, ensureDefault, navigate],
  );
}

function labelFor(p: LekpisPlatform) {
  return p === "instagram" ? "Instagram" : p === "facebook" ? "Facebook" : "Meta Ads";
}
