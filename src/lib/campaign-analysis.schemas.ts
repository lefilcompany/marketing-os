// Client-safe schemas + types for the campaign analysis report.
// Importable from both UI and server (providers) code.

import { z } from "zod";

export const KpiSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  delta: z.number().nullable().optional(),
  deltaPct: z.number().nullable().optional(),
  direction: z.enum(["up", "down", "flat"]).optional(),
});

export const TimeseriesPointSchema = z.object({
  date: z.string(),
  value: z.number(),
  previousValue: z.number().nullable().optional(),
});

export const TimeseriesSchema = z.object({
  metric: z.string(),
  label: z.string().optional(),
  points: z.array(TimeseriesPointSchema),
});

export const TopCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  metric: z.string(),
  value: z.number(),
  deltaPct: z.number().nullable().optional(),
});

export const AttentionSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  title: z.string(),
  description: z.string(),
  campaignId: z.string().optional(),
});

export const RecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export const AnalysisReportSchema = z.object({
  generatedAt: z.string(),
  period: z.object({
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
    previousStart: z.string(),
    previousEnd: z.string(),
  }),
  client: z.object({ id: z.string(), name: z.string() }),
  campaigns: z.array(z.object({ id: z.string(), name: z.string() })),
  kpis: z.array(KpiSchema),
  timeseries: z.array(TimeseriesSchema),
  topCampaigns: z.array(TopCampaignSchema),
  attentionPoints: z.array(AttentionSchema),
  executiveSummary: z.string(),
  recommendations: z.array(RecommendationSchema),
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
export type AnalysisKpi = z.infer<typeof KpiSchema>;
