import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, BarChart3, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Trophy, ArrowRight } from "lucide-react";
import {
  lekpisConnectionStatus,
  lekpisListClients,
  lekpisListCampaigns,
  runCampaignAnalysis,
} from "@/lib/campaign-analysis.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analise-campanhas")({
  head: () => ({
    meta: [
      { title: "Análise de Campanhas — LeKPIs" },
      { name: "description", content: "Análise automática de campanhas via MCP LeKPIs." },
    ],
  }),
  component: AnaliseCampanhasPage,
});

type Client = { id: string; name: string };
type Campaign = { id: string; name: string; status?: string; channel?: string };
type Report = Awaited<ReturnType<typeof runCampaignAnalysis>> extends { ok: true; data: infer R } ? R : never;

function AnaliseCampanhasPage() {
  const statusFn = useServerFn(lekpisConnectionStatus);
  const listClientsFn = useServerFn(lekpisListClients);
  const listCampaignsFn = useServerFn(lekpisListCampaigns);
  const runFn = useServerFn(runCampaignAnalysis);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo",
    [],
  );

  const [clientId, setClientId] = useState<string>("");
  const [campaignIds, setCampaignIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const conn = useQuery({
    queryKey: ["lekpis", "conn"],
    queryFn: () => statusFn({}),
  });

  const clientsQ = useQuery({
    queryKey: ["lekpis", "clients"],
    queryFn: () => listClientsFn({}),
    enabled: !!conn.data?.connected,
    staleTime: 5 * 60_000,
  });

  const campaignsQ = useQuery({
    queryKey: ["lekpis", "campaigns", clientId],
    queryFn: () => listCampaignsFn({ data: { clientId } }),
    enabled: !!clientId && !!conn.data?.connected,
    staleTime: 60_000,
  });

  const runMut = useMutation({
    mutationFn: () =>
      runFn({
        data: {
          clientId,
          campaignIds,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          timezone,
        },
      }),
  });

  const clients: Client[] = clientsQ.data?.ok ? clientsQ.data.data : [];
  const campaigns: Campaign[] = campaignsQ.data?.ok ? campaignsQ.data.data : [];

  const canRun =
    !!clientId && campaignIds.length > 0 && startDate <= endDate && !runMut.isPending;

  const report: Report | null = runMut.data?.ok ? (runMut.data.data as Report) : null;
  const reportError = runMut.data && !runMut.data.ok ? runMut.data.error : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
            <BarChart3 className="h-3.5 w-3.5" /> LeKPIs · MCP
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            Análise de Campanhas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Selecione um cliente, as campanhas e o período. O Marketing OS consulta o
            MCP do LeKPIs e monta a análise automaticamente.
          </p>
        </div>
      </header>

      {conn.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !conn.data?.connected ? (
        <NotConnected />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros da análise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Cliente</label>
                  <Select
                    value={clientId}
                    onValueChange={(v) => {
                      setClientId(v);
                      setCampaignIds([]);
                    }}
                    disabled={clientsQ.isLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={clientsQ.isLoading ? "Carregando..." : "Selecione o cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clientsQ.data && !clientsQ.data.ok && (
                    <p className="mt-1 text-xs text-destructive">{clientsQ.data.error.message}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Campanhas {campaignIds.length > 0 && `(${campaignIds.length} selecionadas)`}
                  </label>
                  <CampaignsMultiSelect
                    campaigns={campaigns}
                    disabled={!clientId || campaignsQ.isLoading}
                    loading={campaignsQ.isLoading}
                    error={campaignsQ.data && !campaignsQ.data.ok ? campaignsQ.data.error.message : undefined}
                    selected={campaignIds}
                    onChange={setCampaignIds}
                  />
                </div>

                <DatePickerField label="Data inicial" value={startDate} onChange={setStartDate} />
                <DatePickerField label="Data final" value={endDate} onChange={setEndDate} />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-xs text-muted-foreground">
                  Fuso horário: <span className="font-medium">{timezone}</span>
                </p>
                <Button onClick={() => runMut.mutate()} disabled={!canRun} size="lg">
                  {runMut.isPending ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" /> Gerar análise</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {runMut.isPending && <ReportSkeleton />}

          {reportError && !runMut.isPending && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Não foi possível gerar a análise</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{friendlyError(reportError.code, reportError.message)}</p>
                <Button variant="outline" size="sm" onClick={() => runMut.mutate()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-2" /> Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {report && !runMut.isPending && <ReportView report={report} />}
        </>
      )}
    </div>
  );
}

function NotConnected() {
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>LeKPIs não conectado</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>Para gerar análises, conecte a plataforma LeKPIs em Configurações → MCP.</p>
        <Button asChild variant="outline" size="sm">
          <a href="/configuracoes">Conectar LeKPIs <ArrowRight className="h-3.5 w-3.5 ml-2" /></a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function friendlyError(code: string, message: string): string {
  switch (code) {
    case "MCP_NOT_CONNECTED":
      return "O LeKPIs não está conectado. Conecte em Configurações → MCP.";
    case "MCP_TIMEOUT":
      return "A análise demorou mais que o esperado. Tente novamente ou reduza o período.";
    case "MCP_TOOL_NOT_FOUND":
      return "A ferramenta de análise não está disponível no MCP do LeKPIs.";
    case "MCP_VALIDATION_ERROR":
      return "Recebemos dados inesperados do LeKPIs.";
    case "MCP_TOOL_ERROR":
      return `O LeKPIs retornou um erro: ${message}`;
    default:
      return message || "Erro desconhecido.";
  }
}

function DatePickerField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="mt-1 w-full justify-start text-left font-normal">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {format(value, "PPP", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => d && onChange(d)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CampaignsMultiSelect({
  campaigns, disabled, loading, error, selected, onChange,
}: {
  campaigns: Campaign[];
  disabled: boolean;
  loading: boolean;
  error?: string;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? "Selecione as campanhas"
      : selected.length === 1
        ? campaigns.find((c) => c.id === selected[0])?.name ?? "1 campanha"
        : `${selected.length} campanhas`;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="mt-1 w-full justify-between font-normal" disabled={disabled}>
            <span className="truncate">{loading ? "Carregando..." : label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex items-center justify-between border-b p-2">
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange(campaigns.map((c) => c.id))}
              type="button"
            >
              Selecionar todas
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onChange([])}
              type="button"
            >
              Limpar
            </button>
          </div>
          <ScrollArea className="max-h-72">
            <div className="p-1">
              {campaigns.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">Nenhuma campanha.</div>
              ) : (
                campaigns.map((c) => {
                  const checked = selected.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          if (v) onChange([...selected, c.id]);
                          else onChange(selected.filter((id) => id !== c.id));
                        }}
                      />
                      <span className="text-sm truncate flex-1">{c.name}</span>
                      {c.status && <Badge variant="outline" className="text-[10px]">{c.status}</Badge>}
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function formatValue(v: number, unit?: string): string {
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (unit === "BRL" || unit === "R$") {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  }
  if (Math.abs(v) >= 1000) return v.toLocaleString("pt-BR");
  return String(v);
}

function ReportView({ report }: { report: Report }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      {report.kpis.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">KPIs principais</h2>
          <div className="grid gap-4 md:grid-cols-4">
            {report.kpis.map((k) => (
              <KpiCard key={k.key} kpi={k} />
            ))}
          </div>
        </section>
      )}

      {/* Timeseries */}
      {report.timeseries.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2">Evolução das métricas</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {report.timeseries.map((ts) => (
              <Card key={ts.metric}>
                <CardHeader><CardTitle className="text-sm">{ts.label ?? ts.metric}</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ts.points}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis fontSize={11} />
                      <RTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" name="Atual" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      {ts.points.some((p) => p.previousValue != null) && (
                        <Line type="monotone" dataKey="previousValue" name="Anterior" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {report.topCampaigns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Campanhas de melhor desempenho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.topCampaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.metric}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatValue(c.value)}</p>
                    {c.deltaPct != null && <DeltaLabel value={c.deltaPct} />}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {report.attentionPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Pontos de atenção
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.attentionPoints.map((a, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={a.severity === "critical" ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {a.severity}
                    </Badge>
                    <p className="text-sm font-medium">{a.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {report.executiveSummary && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Resumo executivo</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
          </CardContent>
        </Card>
      )}

      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recomendações</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {report.recommendations.map((r, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={r.priority === "high" ? "default" : "outline"}
                    className="text-[10px] capitalize"
                  >
                    {r.priority}
                  </Badge>
                  <p className="text-sm font-medium">{r.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <footer className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>
          Período: {report.period.start} → {report.period.end} · vs. {report.period.previousStart} → {report.period.previousEnd}
        </span>
        <span>
          Última atualização: {new Date(report.generatedAt).toLocaleString("pt-BR", { timeZone: report.period.timezone })}
        </span>
      </footer>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Report["kpis"][number] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{formatValue(kpi.value, kpi.unit)}</p>
        {kpi.deltaPct != null && <DeltaLabel value={kpi.deltaPct} className="mt-1" />}
      </CardContent>
    </Card>
  );
}

function DeltaLabel({ value, className }: { value: number; className?: string }) {
  const dir = value > 0.1 ? "up" : value < -0.1 ? "down" : "flat";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  const color = dir === "up" ? "text-emerald-600" : dir === "down" ? "text-red-600" : "text-muted-foreground";
  return (
    <div className={cn("flex items-center gap-1 text-xs font-medium", color, className)}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? "+" : ""}{value.toFixed(1)}% vs. período anterior
    </div>
  );
}
