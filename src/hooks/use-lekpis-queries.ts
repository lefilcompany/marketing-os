import { useMutation, useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { callLekpis, isLekpisToolUnavailable } from "@/lib/lekpis-client";
import { toast } from "sonner";

// Swallow "Method not found" (LeKPIs backend under reconstruction) as empty
// results, so the UI degrades gracefully instead of blowing up.
async function safeCallLekpis<T>(name: string, args: Record<string, any>, fallback: T): Promise<T> {
  try {
    return await callLekpis<T>(name, args);
  } catch (err) {
    if (isLekpisToolUnavailable(err)) return fallback;
    throw err;
  }
}

type Items<T> = { items: T[] };

// -------- Profile --------

export type LekpisProfile = {
  id?: string;
  nome?: string | null;
  avatar_url?: string | null;
  telefone?: string | null;
  estado?: string | null;
  cidade?: string | null;
  tipo_empresa?: string | null;
  volume_clientes?: string | null;
  [k: string]: any;
};

export function profileGetOptions() {
  return queryOptions({
    queryKey: ["lekpis", "profile.get"],
    queryFn: async () => {
      const res = await safeCallLekpis<LekpisProfile | Items<LekpisProfile> | null>(
        "profile.get",
        {},
        null,
      );
      const items = (res as any)?.items;
      return (Array.isArray(items) ? items[0] : (res as LekpisProfile)) ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function useProfile() {
  return useQuery(profileGetOptions());
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<LekpisProfile>) => callLekpis("profile.update", patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lekpis", "profile.get"] });
      toast.success("Perfil atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// -------- Cliente --------

export type Cliente = { id: string; nome?: string | null; [k: string]: any };

export function clienteListOptions() {
  return queryOptions({
    queryKey: ["lekpis", "cliente.list"],
    queryFn: () => safeCallLekpis<Items<Cliente>>("cliente.list", {}, { items: [] }),
    staleTime: 30_000,
    retry: false,
  });
}

export function useClienteList() {
  return useQuery(clienteListOptions());
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { nome: string; [k: string]: any }) => callLekpis<Cliente>("cliente.create", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lekpis", "cliente.list"] });
      toast.success("Cliente criado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// -------- Integrações --------

export type Integracao = {
  id: string;
  platform?: "instagram" | "facebook" | "meta_ads" | string;
  plataforma?: "instagram" | "facebook" | "meta_ads" | string;
  status?: string;
  conta?: string | null;
  account_name?: string | null;
  [k: string]: any;
};

export function normalizeLekpisPlatform(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized === "metaads" || normalized === "meta_ads") return "meta_ads";
  if (normalized === "instagram") return "instagram";
  if (normalized === "facebook") return "facebook";
  return normalized || null;
}

export function getIntegracaoPlatform(integracao: Integracao | null | undefined) {
  return normalizeLekpisPlatform(integracao?.platform ?? integracao?.plataforma);
}

function normalizeItemsResponse<T extends Record<string, any>>(res: T[] | Items<T> | T | null | undefined) {
  if (Array.isArray(res)) return { items: res };
  if (Array.isArray((res as any)?.items)) return res as Items<T>;
  if (res && typeof res === "object") return { items: [res as T] };
  return { items: [] as T[] };
}

export function integracaoListOptions(clienteId: string | null) {
  return queryOptions({
    queryKey: ["lekpis", "integracao.list", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const res = await callLekpis<Items<Integracao> | Integracao[] | Integracao>("integracao.list", {
        cliente_id: clienteId,
      });
      const normalized = normalizeItemsResponse(res);
      return {
        ...(res && !Array.isArray(res) && typeof res === "object" ? res : {}),
        items: normalized.items.map((item) => ({
          ...item,
          platform: getIntegracaoPlatform(item) ?? item.platform,
        })),
      } as Items<Integracao>;
    },
    staleTime: 15_000,
  });
}

export function useIntegracoes(clienteId: string | null) {
  return useQuery(integracaoListOptions(clienteId));
}

export function useDisconnectIntegracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => callLekpis("integracao.disconnect", { id, confirm: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lekpis", "integracao.list"] });
      qc.invalidateQueries({ queryKey: ["lekpis"] });
      toast.success("Integração desconectada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// -------- KPIs por plataforma --------

export type Kpi = {
  id?: string;
  data_ref?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  seguidores?: number | null;
  fas?: number | null;
  investimento?: number | null;
  alcance?: number | null;
  impressoes?: number | null;
  interacoes?: number | null;
  visitas_perfil?: number | null;
  [k: string]: any;
};

function kpiOptions(tool: string, clienteId: string | null) {
  return queryOptions({
    queryKey: ["lekpis", tool, clienteId],
    enabled: !!clienteId,
    queryFn: () => callLekpis<Items<Kpi>>(tool, { cliente_id: clienteId }),
    staleTime: 30_000,
  });
}

export const instagramKpisOptions = (id: string | null) => kpiOptions("instagram.get_kpis", id);
export const instagramKpisPreviousOptions = (id: string | null) =>
  kpiOptions("instagram.get_kpis_previous", id);
export const facebookKpisOptions = (id: string | null) => kpiOptions("facebook.get_kpis", id);

export type Campaign = {
  id?: string;
  nome?: string | null;
  status?: string | null;
  investimento?: number | null;
  gasto?: number | null;
  spend?: number | null;
  impressoes?: number | null;
  cliques?: number | null;
  [k: string]: any;
};

export function metaAdsCampaignsOptions(clienteId: string | null) {
  return queryOptions({
    queryKey: ["lekpis", "meta_ads.list_campaigns", clienteId],
    enabled: !!clienteId,
    queryFn: () => callLekpis<Items<Campaign>>("meta_ads.list_campaigns", { cliente_id: clienteId }),
    staleTime: 30_000,
  });
}

export function useMetaAdsCampaigns(clienteId: string | null) {
  return useQuery(metaAdsCampaignsOptions(clienteId));
}

// -------- Helpers --------

export function pctDelta(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
