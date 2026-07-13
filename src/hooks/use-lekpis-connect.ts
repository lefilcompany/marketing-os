import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { callLekpis } from "@/lib/lekpis-client";
import { toast } from "sonner";

export type LekpisPlatform = "instagram" | "facebook" | "meta_ads";

/**
 * Abre popup de OAuth do LeKPIs para conectar uma plataforma.
 * A callback `/api/mcp/callback` faz window.opener.postMessage({type:'mcp:connected', provider}) same-origin.
 * Também aceitamos postMessage do domínio real do LeKPIs (pla.lekpis.lefil.com.br) quando disponível.
 */
export function useLekpisConnect() {
  const qc = useQueryClient();
  const handlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  useEffect(() => () => {
    if (handlerRef.current) {
      window.removeEventListener("message", handlerRef.current);
      handlerRef.current = null;
    }
  }, []);

  return useCallback(
    async (platform: LekpisPlatform, clienteId: string) => {
      if (!clienteId) {
        toast.error("Nenhum cliente ativo selecionado.");
        return;
      }
      let url: string | undefined;
      try {
        const res = await callLekpis<{ url?: string; items?: Array<{ url: string }> }>(
          "integracao.get_connect_url",
          { platform, cliente_id: clienteId },
        );
        url = res?.url ?? res?.items?.[0]?.url;
      } catch (e) {
        toast.error((e as Error).message ?? "Falha ao obter URL de conexão.");
        return;
      }
      if (!url) {
        toast.error("URL de conexão não retornada.");
        return;
      }

      const popup = window.open(url, "lekpis-connect", "width=600,height=720");

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
    [qc],
  );
}

function labelFor(p: LekpisPlatform) {
  return p === "instagram" ? "Instagram" : p === "facebook" ? "Facebook" : "Meta Ads";
}
