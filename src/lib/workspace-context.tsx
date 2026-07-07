import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type WorkspaceCtx = {
  currentOrgId: string | null;
  setCurrentOrgId: (id: string) => void;
};

const Ctx = createContext<WorkspaceCtx | null>(null);
const STORAGE_KEY = "mos:current-org";

export function WorkspaceProvider({ children, initialOrgId }: { children: ReactNode; initialOrgId: string | null }) {
  const [currentOrgId, setOrgId] = useState<string | null>(initialOrgId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== currentOrgId) setOrgId(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrentOrgId = (id: string) => {
    setOrgId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  };

  return <Ctx.Provider value={{ currentOrgId, setCurrentOrgId }}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return c;
}
