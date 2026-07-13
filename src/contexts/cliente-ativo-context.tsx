import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callLekpis } from "@/lib/lekpis-client";

const STORAGE_KEY = "lekpis:cliente-id";

type Cliente = {
  id: string;
  nome?: string | null;
  [k: string]: any;
};

type Ctx = {
  clienteId: string | null;
  cliente: Cliente | null;
  setClienteId: (id: string) => void;
  loading: boolean;
};

const ClienteAtivoCtx = createContext<Ctx | null>(null);

export function ClienteAtivoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [clienteId, setClienteIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [ensured, setEnsured] = useState(false);

  // Boot: se não tem cliente ativo, chama cliente.ensure_default.
  useEffect(() => {
    if (clienteId || ensured) return;
    setEnsured(true);
    callLekpis<{ items?: Cliente[]; id?: string }>("cliente.ensure_default", {})
      .then((res) => {
        const id = res?.id ?? res?.items?.[0]?.id;
        if (id) {
          window.localStorage.setItem(STORAGE_KEY, id);
          setClienteIdState(id);
        }
      })
      .catch(() => {
        // Silenciar — telas mostrarão empty state / prompt de conexão.
      });
  }, [clienteId, ensured]);

  const clienteQ = useQuery({
    queryKey: ["lekpis", "cliente.get", clienteId],
    enabled: !!clienteId,
    queryFn: () => callLekpis<{ items?: Cliente[] } | Cliente>("cliente.get", { cliente_id: clienteId }),
    staleTime: 60_000,
  });

  const cliente: Cliente | null = (() => {
    const d = clienteQ.data as any;
    if (!d) return null;
    if (Array.isArray(d?.items)) return d.items[0] ?? null;
    return d as Cliente;
  })();

  const setClienteId = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setClienteIdState(id);
    qc.invalidateQueries({ queryKey: ["lekpis"] });
  };

  return (
    <ClienteAtivoCtx.Provider
      value={{ clienteId, cliente, setClienteId, loading: !clienteId && !ensured }}
    >
      {children}
    </ClienteAtivoCtx.Provider>
  );
}

export function useClienteAtivo() {
  const c = useContext(ClienteAtivoCtx);
  if (!c) throw new Error("useClienteAtivo must be used inside ClienteAtivoProvider");
  return c;
}
