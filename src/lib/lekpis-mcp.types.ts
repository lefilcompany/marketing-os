// Public shape types for LeKPIs MCP responses (loose because contract is validated at runtime).

export type LekpisProviderSlug = "meta_ads" | "google_ads" | string;

export type ConnectProviderResponse = {
  authorize_url?: string;
  url?: string;
  redirect_url?: string;
};

export type AvailableAccount = {
  external_account_id?: string;
  id?: string;
  name?: string;
  provider?: LekpisProviderSlug;
  currency?: string;
  timezone?: string;
  status?: string;
  selected?: boolean;
};

export type SyncMetricsResponse = {
  job_id?: string;
  status?: string;
  message?: string;
};

export type DashboardMetric = {
  key?: string;
  metric?: string;
  name?: string;
  value?: number | null;
  currency?: string;
  target?: number | null;
  provider?: string;
  updated_at?: string;
  last_updated_at?: string;
  has_data?: boolean;
  hasData?: boolean;
};

export type DashboardResponse = {
  metrics?: DashboardMetric[];
  items?: DashboardMetric[];
  period?: { start?: string; end?: string };
  currency?: string;
  updated_at?: string;
};

export type MetricSeriesPoint = {
  date?: string;
  day?: string;
  timestamp?: string;
  value?: number | null;
};

export type MetricSeriesResponse = {
  metric?: string;
  provider?: string;
  currency?: string;
  target?: number | null;
  series?: MetricSeriesPoint[];
  points?: MetricSeriesPoint[];
  period?: { start?: string; end?: string };
};

export type UpdateMetricTargetResponse = {
  ok?: boolean;
  metric?: string;
  target?: number;
};
