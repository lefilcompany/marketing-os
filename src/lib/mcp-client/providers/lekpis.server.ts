// LeKPIs MCP provider wrappers — server-only.
// Schemas Zod + orquestração de tools. Tool names são resolvidos dinamicamente
// via tools/list para tolerar variações (snake_case, camelCase, prefixos).

import { z } from "zod";
import {
  callMcpTool,
  getMcpCredentials,
  listAvailableTools,
  type McpCreds,
} from "../transport.server";
import { McpClientError } from "../errors";
import {
  AnalysisReportSchema,
  type AnalysisReport,
} from "@/lib/campaign-analysis.schemas";

export type { AnalysisReport };

export const PROVIDER_SLUG = "lekpis";

// ---------- Schemas ----------

export const ClientSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
});
export type LeKpisClient = z.infer<typeof ClientSchema>;

export const CampaignSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  status: z.string().optional(),
  channel: z.string().optional(),
});
export type LeKpisCampaign = z.infer<typeof CampaignSchema>;

const ListWrap = <T extends z.ZodTypeAny>(item: T) =>
  z.union([
    z.array(item),
    z.object({ items: z.array(item) }).transform((o) => o.items),
    z.object({ data: z.array(item) }).transform((o) => o.data),
    z.object({ results: z.array(item) }).transform((o) => o.results),
  ]);

// ---------- Tool resolution ----------

type ToolNames = {
  listClients?: string;
  listCampaigns?: string;
  runAnalysis?: string;
};

const CANDIDATES = {
  listClients: [
    "list_clients", "listClients", "clients_list", "get_clients", "clients",
  ],
  listCampaigns: [
    "list_campaigns", "listCampaigns", "campaigns_list", "get_campaigns", "campaigns",
  ],
  runAnalysis: [
    "run_campaign_analysis", "runCampaignAnalysis", "campaign_analysis",
    "analyze_campaigns", "generate_analysis", "campaigns_analysis", "analysis",
  ],
};

async function resolveTools(creds: McpCreds): Promise<ToolNames> {
  const tools = await listAvailableTools(creds);
  const names = new Set(tools.map((t) => t.name));
  const pick = (list: string[]) => list.find((n) => names.has(n));
  return {
    listClients: pick(CANDIDATES.listClients),
    listCampaigns: pick(CANDIDATES.listCampaigns),
    runAnalysis: pick(CANDIDATES.runAnalysis),
  };
}

// ---------- Public API ----------

export async function listClients(userId: string): Promise<LeKpisClient[]> {
  const creds = await getMcpCredentials(userId, PROVIDER_SLUG);
  const resolved = await resolveTools(creds);
  if (!resolved.listClients) {
    throw new McpClientError(
      "MCP_TOOL_NOT_FOUND",
      "Tool de listagem de clientes não disponível no LeKPIs.",
    );
  }
  return callMcpTool<LeKpisClient[]>({
    provider: PROVIDER_SLUG,
    tool: resolved.listClients,
    creds,
    outputSchema: ListWrap(ClientSchema),
    timeoutMs: 20_000,
  });
}

export async function listCampaigns(
  userId: string,
  clientId: string,
): Promise<LeKpisCampaign[]> {
  const creds = await getMcpCredentials(userId, PROVIDER_SLUG);
  const resolved = await resolveTools(creds);
  if (!resolved.listCampaigns) {
    throw new McpClientError(
      "MCP_TOOL_NOT_FOUND",
      "Tool de listagem de campanhas não disponível no LeKPIs.",
    );
  }
  return callMcpTool<LeKpisCampaign[]>({
    provider: PROVIDER_SLUG,
    tool: resolved.listCampaigns,
    args: { client_id: clientId, clientId },
    creds,
    outputSchema: ListWrap(CampaignSchema),
    timeoutMs: 20_000,
  });
}

export type RunAnalysisInput = {
  clientId: string;
  campaignIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string;
  timezone: string;
};

/** Fallback: computes previous period of same length ending day before start. */
function previousPeriod(start: string, end: string): { previousStart: string; previousEnd: string } {
  const s = new Date(`${start}T00:00:00Z`).getTime();
  const e = new Date(`${end}T00:00:00Z`).getTime();
  const spanMs = e - s;
  const prevEnd = new Date(s - 24 * 3600 * 1000);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return {
    previousStart: prevStart.toISOString().slice(0, 10),
    previousEnd: prevEnd.toISOString().slice(0, 10),
  };
}

export async function runCampaignAnalysis(
  userId: string,
  input: RunAnalysisInput,
): Promise<AnalysisReport> {
  const creds = await getMcpCredentials(userId, PROVIDER_SLUG);
  const resolved = await resolveTools(creds);
  if (!resolved.runAnalysis) {
    throw new McpClientError(
      "MCP_TOOL_NOT_FOUND",
      "Tool de análise de campanhas não disponível no LeKPIs. Adicione-a no MCP.",
    );
  }

  const args = {
    client_id: input.clientId,
    clientId: input.clientId,
    campaign_ids: input.campaignIds,
    campaignIds: input.campaignIds,
    start_date: input.startDate,
    startDate: input.startDate,
    end_date: input.endDate,
    endDate: input.endDate,
    timezone: input.timezone,
  };

  const raw = await callMcpTool<unknown>({
    provider: PROVIDER_SLUG,
    tool: resolved.runAnalysis,
    args,
    creds,
    timeoutMs: 60_000,
  });

  // Try direct parse first.
  const direct = AnalysisReportSchema.safeParse(raw);
  if (direct.success) return direct.data;

  // Best-effort normalization: fill defaults + previous period if missing.
  const obj = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) as Record<string, unknown>;
  const period = (obj.period as Record<string, unknown> | undefined) ?? {};
  const prev = previousPeriod(input.startDate, input.endDate);
  const normalized = {
    generatedAt: (obj.generatedAt as string) ?? new Date().toISOString(),
    period: {
      start: (period.start as string) ?? input.startDate,
      end: (period.end as string) ?? input.endDate,
      timezone: (period.timezone as string) ?? input.timezone,
      previousStart: (period.previousStart as string) ?? prev.previousStart,
      previousEnd: (period.previousEnd as string) ?? prev.previousEnd,
    },
    client: (obj.client as unknown) ?? { id: input.clientId, name: input.clientId },
    campaigns: (obj.campaigns as unknown) ?? input.campaignIds.map((id) => ({ id, name: id })),
    kpis: (obj.kpis as unknown) ?? [],
    timeseries: (obj.timeseries as unknown) ?? [],
    topCampaigns: (obj.topCampaigns as unknown) ?? obj.top_campaigns ?? [],
    attentionPoints: (obj.attentionPoints as unknown) ?? obj.attention_points ?? [],
    executiveSummary:
      (obj.executiveSummary as string) ??
      (obj.executive_summary as string) ??
      (obj.summary as string) ??
      "",
    recommendations: (obj.recommendations as unknown) ?? [],
  };

  const check = AnalysisReportSchema.safeParse(normalized);
  if (!check.success) {
    throw new McpClientError(
      "MCP_VALIDATION_ERROR",
      "A resposta do LeKPIs não pôde ser interpretada no formato esperado.",
      check.error.issues,
    );
  }
  return check.data;
}
