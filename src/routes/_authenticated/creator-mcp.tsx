import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  Plug,
  RefreshCw,
  Play,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Loader2,
  Unplug,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  creatorConnectionStatus,
  listCreatorTools,
  runCreatorTool,
  type CreatorToolDescriptor,
} from "@/lib/creator-mcp.functions";
import { startMcpAuth, disconnectMcp } from "@/lib/mcp.functions";

export const Route = createFileRoute("/_authenticated/creator-mcp")({
  head: () => ({
    meta: [
      { title: "Creator MCP · Marketing OS" },
      {
        name: "description",
        content:
          "Execute ferramentas do Creator V4 diretamente pela UI via MCP.",
      },
    ],
  }),
  component: CreatorMcpPage,
});

// ---------- Types ----------

type Annotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  title?: string;
};

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  description?: string;
  title?: string;
  items?: JsonSchema;
  default?: unknown;
};

type RunEntry = {
  id: string;
  toolName: string;
  startedAt: number;
  durationMs: number;
  ok: boolean;
  errorMessage?: string;
};

// ---------- Page ----------

function CreatorMcpPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(creatorConnectionStatus);
  const listFn = useServerFn(listCreatorTools);
  const startFn = useServerFn(startMcpAuth);
  const disconnectFn = useServerFn(disconnectMcp);

  const [search, setSearch] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [history, setHistory] = useState<RunEntry[]>([]);

  const status = useQuery({
    queryKey: ["creator-mcp", "status"],
    queryFn: () => statusFn({}),
    refetchOnWindowFocus: true,
  });

  const connected = !!status.data?.connected;

  const tools = useQuery({
    queryKey: ["creator-mcp", "tools"],
    queryFn: () => listFn({}),
    enabled: connected,
    retry: 0,
  });

  const start = useMutation({
    mutationFn: () =>
      startFn({ data: { provider: "creator", returnTo: "/creator-mcp" } }),
    onSuccess: ({ authorizeUrl }) => {
      const w = window.open(
        authorizeUrl,
        "creator-oauth",
        "width=520,height=720",
      );
      if (!w) window.location.href = authorizeUrl;
      // Poll for connection completion.
      const poll = window.setInterval(async () => {
        const s = await statusFn({});
        if (s.connected) {
          window.clearInterval(poll);
          qc.invalidateQueries({ queryKey: ["creator-mcp"] });
          toast.success("Creator conectado.");
        }
      }, 1500);
      window.setTimeout(() => window.clearInterval(poll), 120_000);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectFn({ data: { provider: "creator" } }),
    onSuccess: () => {
      toast.success("Creator desconectado.");
      qc.invalidateQueries({ queryKey: ["creator-mcp"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toolList: CreatorToolDescriptor[] = useMemo(() => {
    const raw = tools.data?.ok ? tools.data.data : [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter((t) =>
      [t.name, t.title, t.description]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [tools.data, search]);

  const selected = useMemo(
    () => toolList.find((t) => t.name === selectedName) ?? null,
    [toolList, selectedName],
  );

  function addHistory(entry: RunEntry) {
    setHistory((h) => [entry, ...h].slice(0, 10));
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-hero grid place-items-center shadow-sm">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-display font-semibold">Creator MCP</h1>
          <p className="text-sm text-muted-foreground">
            Execute ferramentas do Creator V4 diretamente pela UI.
          </p>
        </div>
        <div className="flex-1" />
        <StatusBadge status={status} />
        {connected ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["creator-mcp"] });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              Recarregar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-3.5 w-3.5 mr-2" />
              )}
              Desconectar
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => start.mutate()}
            disabled={start.isPending}
          >
            {start.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5 mr-2" />
            )}
            Conectar Creator
          </Button>
        )}
      </div>

      {/* Not connected */}
      {!connected && !status.isLoading && (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <Plug className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <div className="font-medium">Conecte o Creator V4</div>
              <div className="text-sm text-muted-foreground">
                Autorize o Marketing OS a executar ferramentas em seu nome.
              </div>
            </div>
            <Button onClick={() => start.mutate()} disabled={start.isPending}>
              {start.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Conectar Creator
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected: two-column layout */}
      {connected && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Tool list */}
          <Card className="flex flex-col max-h-[calc(100dvh-180px)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Ferramentas</CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {toolList.length}
                </Badge>
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar…"
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {tools.isLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  {tools.data && !tools.data.ok && (
                    <div className="p-3 text-sm text-destructive flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium">
                          Falha ao listar ferramentas
                        </div>
                        <div className="text-xs">{tools.data.error.message}</div>
                      </div>
                    </div>
                  )}
                  {tools.data?.ok && toolList.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground">
                      Nenhuma ferramenta encontrada.
                    </div>
                  )}
                  {toolList.map((t) => {
                    const active = t.name === selectedName;
                    const ann = parseJson<Annotations>(t.annotationsJson) ?? {};
                    return (
                      <button
                        key={t.name}
                        onClick={() => setSelectedName(t.name)}
                        className={`w-full text-left rounded-md border p-2.5 transition ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-accent"
                        }`}
                      >
                        <div className="text-sm font-medium truncate">
                          {t.title ?? t.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                          {t.name}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {ann.readOnlyHint && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] py-0 h-4"
                            >
                              read-only
                            </Badge>
                          )}
                          {ann.destructiveHint && (
                            <Badge
                              variant="destructive"
                              className="text-[9px] py-0 h-4"
                            >
                              destructive
                            </Badge>
                          )}
                          {ann.idempotentHint && (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 h-4"
                            >
                              idempotent
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Runner */}
          <div className="min-w-0 space-y-4">
            {selected ? (
              <ToolRunner
                key={selected.name}
                tool={selected}
                onRunLogged={addHistory}
              />
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Selecione uma ferramenta à esquerda para começar.
                </CardContent>
              </Card>
            )}

            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Histórico da sessão
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        {h.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span className="font-mono truncate flex-1">
                          {h.toolName}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {h.durationMs}ms
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(h.startedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Status badge ----------

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof useQuery<{ connected: boolean; expiringSoon?: boolean }>>;
}) {
  if (status.isLoading) {
    return (
      <Badge variant="secondary">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Verificando…
      </Badge>
    );
  }
  if (!status.data?.connected) {
    return <Badge variant="outline">Desconectado</Badge>;
  }
  if (status.data.expiringSoon) {
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Expirando
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-600 hover:bg-green-600">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Conectado
    </Badge>
  );
}

// ---------- Tool runner ----------

function ToolRunner({
  tool,
  onRunLogged,
}: {
  tool: CreatorToolDescriptor;
  onRunLogged: (e: RunEntry) => void;
}) {
  const runFn = useServerFn(runCreatorTool);
  const schema = useMemo(
    () => parseJson<JsonSchema>(tool.inputSchemaJson) ?? { type: "object" },
    [tool.inputSchemaJson],
  );
  const annotations = useMemo(
    () => parseJson<Annotations>(tool.annotationsJson) ?? {},
    [tool.annotationsJson],
  );
  const destructive = !!annotations.destructiveHint;

  const [formValues, setFormValues] = useState<Record<string, unknown>>(() =>
    initFormValues(schema),
  );
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState(() =>
    JSON.stringify(initFormValues(schema), null, 2),
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    payload: string;
    at: number;
  } | null>(null);

  const run = useMutation({
    mutationFn: async () => {
      const argsJson = rawMode
        ? rawJson
        : JSON.stringify(pruneEmpty(formValues));
      const startedAt = Date.now();
      const res = await runFn({
        data: { name: tool.name, argsJson },
      });
      const durationMs = Date.now() - startedAt;
      return { res, startedAt, durationMs };
    },
    onSuccess: ({ res, startedAt, durationMs }) => {
      const id = `${tool.name}-${startedAt}`;
      if (res.ok) {
        setResult({ ok: true, payload: res.data, at: startedAt });
        onRunLogged({
          id,
          toolName: tool.name,
          startedAt,
          durationMs,
          ok: true,
        });
      } else {
        setResult({
          ok: false,
          payload: JSON.stringify(res.error, null, 2),
          at: startedAt,
        });
        onRunLogged({
          id,
          toolName: tool.name,
          startedAt,
          durationMs,
          ok: false,
          errorMessage: res.error.message,
        });
        toast.error(res.error.message);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function tryRun() {
    if (destructive) {
      setConfirmOpen(true);
      return;
    }
    run.mutate();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">
              {tool.title ?? tool.name}
            </CardTitle>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {tool.name}
            </div>
            {tool.description && (
              <p className="text-sm text-muted-foreground mt-2">
                {tool.description}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {annotations.readOnlyHint && (
                <Badge variant="secondary" className="text-[10px]">
                  read-only
                </Badge>
              )}
              {destructive && (
                <Badge variant="destructive" className="text-[10px]">
                  destructive
                </Badge>
              )}
              {annotations.idempotentHint && (
                <Badge variant="outline" className="text-[10px]">
                  idempotent
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={rawMode ? "raw" : "form"}
          onValueChange={(v) => {
            if (v === "raw") {
              setRawJson(JSON.stringify(pruneEmpty(formValues), null, 2));
              setRawMode(true);
            } else {
              setRawMode(false);
            }
          }}
        >
          <TabsList>
            <TabsTrigger value="form">Formulário</TabsTrigger>
            <TabsTrigger value="raw">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="pt-3">
            <SchemaForm
              schema={schema}
              values={formValues}
              onChange={setFormValues}
            />
          </TabsContent>
          <TabsContent value="raw" className="pt-3">
            <Textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder='{"chave": "valor"}'
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button onClick={tryRun} disabled={run.isPending}>
            {run.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Executar
          </Button>
          {run.isPending && (
            <span className="text-xs text-muted-foreground">
              Chamando ferramenta… (timeout 60s)
            </span>
          )}
        </div>

        {result && <ResultView result={result} />}
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Executar ferramenta destrutiva?</AlertDialogTitle>
            <AlertDialogDescription>
              A ferramenta <span className="font-mono">{tool.name}</span> é
              marcada como destrutiva. Confirme antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                run.mutate();
              }}
            >
              Executar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ---------- Result view ----------

function ResultView({
  result,
}: {
  result: { ok: boolean; payload: string; at: number };
}) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(result.payload), null, 2);
    } catch {
      return result.payload;
    }
  }, [result.payload]);

  const textBlocks = useMemo(() => {
    try {
      const p = JSON.parse(result.payload) as {
        content?: Array<{ type: string; text?: string }>;
      };
      return (
        p?.content?.filter((c) => c.type === "text" && c.text).map((c) => c.text!) ??
        []
      );
    } catch {
      return [];
    }
  }, [result.payload]);

  async function copy() {
    await navigator.clipboard.writeText(pretty);
    toast.success("Resultado copiado.");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {result.ok ? (
          <Badge className="bg-green-600 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sucesso
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {new Date(result.at).toLocaleTimeString()}
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="h-3 w-3 mr-1.5" />
          Copiar
        </Button>
      </div>
      <Tabs defaultValue={textBlocks.length > 0 ? "text" : "json"}>
        <TabsList>
          {textBlocks.length > 0 && (
            <TabsTrigger value="text">Texto</TabsTrigger>
          )}
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>
        {textBlocks.length > 0 && (
          <TabsContent value="text" className="pt-2">
            <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap font-mono max-h-[420px] overflow-auto">
              {textBlocks.join("\n\n")}
            </div>
          </TabsContent>
        )}
        <TabsContent value="json" className="pt-2">
          <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-auto max-h-[420px]">
            <code>{pretty}</code>
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Schema-driven form ----------

function SchemaForm({
  schema,
  values,
  onChange,
}: {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const keys = Object.keys(properties);

  if (keys.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Esta ferramenta não requer argumentos.
      </p>
    );
  }

  function setField(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-3">
      {keys.map((key) => {
        const prop = properties[key];
        const value = values[key];
        const isRequired = required.has(key);
        return (
          <FieldRow
            key={key}
            name={key}
            schema={prop}
            value={value}
            required={isRequired}
            onChange={(v) => setField(key, v)}
          />
        );
      })}
    </div>
  );
}

function FieldRow({
  name,
  schema,
  value,
  required,
  onChange,
}: {
  name: string;
  schema: JsonSchema;
  value: unknown;
  required: boolean;
  onChange: (v: unknown) => void;
}) {
  const label = schema.title ?? name;
  const desc = schema.description;
  const enumValues = schema.enum;

  const labelBlock = (
    <div className="space-y-0.5">
      <Label className="text-xs flex items-center gap-1.5">
        <span className="font-mono">{name}</span>
        {required && <span className="text-destructive">*</span>}
        <span className="text-muted-foreground font-normal">
          — {label !== name ? label : schema.type ?? "any"}
        </span>
      </Label>
      {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
    </div>
  );

  // Enum → Select
  if (Array.isArray(enumValues) && enumValues.length > 0) {
    return (
      <div className="space-y-1.5">
        {labelBlock}
        <Select
          value={value == null ? "" : String(value)}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {enumValues.map((v, i) => (
              <SelectItem key={i} value={String(v)}>
                {String(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Boolean → Switch
  if (schema.type === "boolean") {
    return (
      <div className="flex items-start justify-between gap-3">
        {labelBlock}
        <Switch
          checked={!!value}
          onCheckedChange={(v) => onChange(v)}
        />
      </div>
    );
  }

  // Number
  if (schema.type === "number" || schema.type === "integer") {
    return (
      <div className="space-y-1.5">
        {labelBlock}
        <Input
          type="number"
          value={value == null ? "" : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") onChange(undefined);
            else {
              const n = Number(v);
              onChange(Number.isFinite(n) ? n : v);
            }
          }}
        />
      </div>
    );
  }

  // Array or Object → JSON textarea
  if (schema.type === "array" || schema.type === "object") {
    const asText =
      value == null || value === ""
        ? ""
        : typeof value === "string"
          ? value
          : JSON.stringify(value, null, 2);
    return (
      <div className="space-y-1.5">
        {labelBlock}
        <Textarea
          rows={4}
          className="font-mono text-xs"
          placeholder={schema.type === "array" ? "[]" : "{}"}
          value={asText}
          onChange={(e) => {
            const v = e.target.value;
            if (!v.trim()) {
              onChange(undefined);
              return;
            }
            try {
              onChange(JSON.parse(v));
            } catch {
              // Keep as string until valid JSON; caller can still submit via raw mode.
              onChange(v);
            }
          }}
        />
      </div>
    );
  }

  // Default: string (long → textarea)
  const isLong =
    (schema.description && schema.description.length > 80) ||
    (typeof value === "string" && value.length > 80);

  return (
    <div className="space-y-1.5">
      {labelBlock}
      {isLong ? (
        <Textarea
          rows={3}
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          value={value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ---------- Helpers ----------

function parseJson<T>(s: string | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function initFormValues(schema: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const props = schema.properties ?? {};
  for (const [k, p] of Object.entries(props)) {
    if (p.default !== undefined) out[k] = p.default;
  }
  return out;
}

function pruneEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v === "") continue;
    out[k] = v;
  }
  return out;
}
