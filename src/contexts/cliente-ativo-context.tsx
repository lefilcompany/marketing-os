import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  ensureDefault: () => Promise<string | null>;
  ensureError: Error | null;
  ensuring: boolean;
  loading: boolean;
  hasNoClientes: boolean;
};


const ClienteAtivoCtx = createContext<Ctx | null>(null);

function extractId(res: any): string | null {
  if (!res) return null;
  if (typeof res.id === "string") return res.id;
  if (typeof res.cliente_id === "string") return res.cliente_id;
  if (res.cliente && typeof res.cliente.id === "string") return res.cliente.id;
  if (Array.isArray(res.items) && res.items[0]?.id) return res.items[0].id;
  if (Array.isArray(res) && res[0]?.id) return res[0].id;
  return null;
}

export function ClienteAtivoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [clienteId, setClienteIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });
  const [ensureError, setEnsureError] = useState<Error | null>(null);
  const [ensuring, setEnsuring] = useState(false);
  const [hasNoClientes, setHasNoClientes] = useState(false);
  const inFlight = useRef<Promise<string | null> | null>(null);


  const ensureDefault = useCallback(async (): Promise<string | null> => {
    if (inFlight.current) return inFlight.current;
    setEnsuring(true);
    setEnsureError(null);
    const p = (async () => {
      let id: string | null = null;
      try {
        const res = await callLekpis<any>("cliente.ensure_default", {});
        id = extractId(res);
      } catch (e) {
        console.error("[lekpis] cliente.ensure_default falhou:", e);
        // Fallback: tentar cliente.list
        try {
          const list = await callLekpis<any>("cliente.list", {});
          id = extractId(list);
          if (!id) {
            setEnsureError(e as Error);
          }
        } catch (e2) {
          console.error("[lekpis] cliente.list fallback falhou:", e2);
          setEnsureError((e as Error) ?? (e2 as Error));
        }
      }
      if (id) {
        window.localStorage.setItem(STORAGE_KEY, id);
        setClienteIdState(id);
        setEnsureError(null);
      }
      return id;
    })();
    inFlight.current = p;
    try {
      return await p;
    } finally {
      inFlight.current = null;
      setEnsuring(false);
    }
  }, []);

  // Boot: se não tem cliente ativo, chama ensureDefault.
  useEffect(() => {
    if (clienteId) return;
    void ensureDefault();
  }, [clienteId, ensureDefault]);

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
    setEnsureError(null);
    qc.invalidateQueries({ queryKey: ["lekpis"] });
  };

  return (
    <ClienteAtivoCtx.Provider
      value={{
        clienteId,
        cliente,
        setClienteId,
        ensureDefault,
        ensureError,
        ensuring,
        loading: !clienteId && ensuring,
      }}
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
