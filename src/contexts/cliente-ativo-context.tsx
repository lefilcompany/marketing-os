import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callLekpis, isLekpisToolUnavailable } from "@/lib/lekpis-client";

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
  clearClienteId: () => void;
};

const ClienteAtivoCtx = createContext<Ctx | null>(null);

export function ClienteAtivoProvider({
  clienteId: initialId,
  children,
}: {
  clienteId: string;
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const [clienteId, setClienteIdState] = useState<string | null>(initialId);

  const clienteQ = useQuery({
    queryKey: ["lekpis", "cliente.get", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      try {
        return await callLekpis<{ items?: Cliente[] } | Cliente>("cliente.get", {
          cliente_id: clienteId,
        });
      } catch (err) {
        if (isLekpisToolUnavailable(err)) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const cliente: Cliente | null = (() => {
    const d = clienteQ.data as any;
    if (!d) return null;
    if (Array.isArray(d?.items)) return d.items[0] ?? null;
    return d as Cliente;
  })();

  const setClienteId = (id: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch { /* noop */ }
    setClienteIdState(id);
    qc.invalidateQueries({ queryKey: ["lekpis"] });
  };

  const clearClienteId = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
    setClienteIdState(null);
    qc.invalidateQueries({ queryKey: ["lekpis"] });
  };

  return (
    <ClienteAtivoCtx.Provider value={{ clienteId, cliente, setClienteId, clearClienteId }}>
      {children}
    </ClienteAtivoCtx.Provider>
  );
}

export function useClienteAtivo() {
  const c = useContext(ClienteAtivoCtx);
  if (!c) throw new Error("useClienteAtivo must be used inside ClienteAtivoProvider");
  return c;
}

export const CLIENTE_STORAGE_KEY = STORAGE_KEY;
