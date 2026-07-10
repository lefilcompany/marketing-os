import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { callMcpTool } from "@/lib/mcp.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Play,
  Search,
} from "lucide-react";
import { toast } from "sonner";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Tool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: JsonSchema;
};

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  items?: JsonSchema;
  description?: string;
  format?: string;
  default?: unknown;
  title?: string;
};

type Verb = "create" | "list" | "get" | "update" | "delete";

type ResourceGroup = {
  resource: string;
  label: string;
  tools: Partial<Record<Verb, Tool>>;
  others: Tool[];
};

// ------------------------------------------------------------------
// Classify tools by verb + resource
// ------------------------------------------------------------------

const VERB_MAP: Array<{ verb: Verb; keys: string[] }> = [
  { verb: "create", keys: ["create", "add", "new", "insert", "criar", "adicionar", "novo", "nova"] },
  { verb: "list", keys: ["list", "search", "getall", "findall", "listar", "buscar", "pesquisar"] },
  { verb: "get", keys: ["get", "read", "fetch", "find", "detail", "obter", "ler", "visualizar"] },
  { verb: "update", keys: ["update", "edit", "patch", "modify", "atualizar", "editar", "modificar"] },
  { verb: "delete", keys: ["delete", "remove", "destroy", "excluir", "deletar", "remover", "apagar"] },
];

function classify(toolName: string): { verb?: Verb; resource: string } {
  // split by _, -, or camelCase boundary
  const parts = toolName
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[_\-\s]+/)
    .filter(Boolean);
  if (parts.length === 0) return { resource: toolName };

  for (const { verb, keys } of VERB_MAP) {
    if (keys.includes(parts[0])) {
      const rest = parts.slice(1).join("_") || toolName;
      return { verb, resource: singular(rest) };
    }
    if (keys.includes(parts[parts.length - 1])) {
      const rest = parts.slice(0, -1).join("_") || toolName;
      return { verb, resource: singular(rest) };
    }
  }
  return { resource: singular(parts.join("_")) };
}

function singular(word: string): string {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses") || word.endsWith("xes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function humanize(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function groupTools(tools: Tool[]): ResourceGroup[] {
  const map = new Map<string, ResourceGroup>();
  for (const t of tools) {
    const { verb, resource } = classify(t.name);
    const key = resource || "outros";
    if (!map.has(key)) {
      map.set(key, { resource: key, label: humanize(key), tools: {}, others: [] });
    }
    const g = map.get(key)!;
    if (verb && !g.tools[verb]) g.tools[verb] = t;
    else g.others.push(t);
  }
  // Sort: groups with a list first, then alphabetical
  return [...map.values()].sort((a, b) => {
    const aHas = a.tools.list ? 0 : 1;
    const bHas = b.tools.list ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.label.localeCompare(b.label);
  });
}

// ------------------------------------------------------------------
// Parse MCP result -> rows
// ------------------------------------------------------------------

type McpResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
};

function extractPayload(result: unknown): unknown {
  const r = result as McpResult | null;
  if (!r) return null;
  if (r.structuredContent !== undefined && r.structuredContent !== null) {
    return r.structuredContent;
  }
  const text = r.content?.find((c) => c.type === "text")?.text;
  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return r;
}

function toRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((x) => x && typeof x === "object");
  if (payload && typeof payload === "object") {
    // Common wrappers: { items: [...] }, { data: [...] }, { results: [...] }
    for (const key of ["items", "data", "results", "rows", "records", "list"]) {
      const v = (payload as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object");
    }
    // Single object → wrap
    return [payload as Record<string, unknown>];
  }
  return [];
}

function pickColumns(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];
  const keys = new Map<string, number>();
  for (const r of rows.slice(0, 20)) {
    for (const k of Object.keys(r)) keys.set(k, (keys.get(k) ?? 0) + 1);
  }
  const priority = ["id", "name", "title", "label", "email", "status", "role", "created_at", "updated_at"];
  const ordered = [...keys.keys()].sort((a, b) => {
    const pa = priority.indexOf(a);
    const pb = priority.indexOf(b);
    if (pa !== -1 || pb !== -1) return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    return a.localeCompare(b);
  });
  return ordered.slice(0, 5);
}

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 80) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v).slice(0, 80);
}

function findIdField(row: Record<string, unknown>): string | undefined {
  for (const key of ["id", "uuid", "slug", "key", "name"]) {
    if (row[key] !== undefined) return key;
  }
  return undefined;
}

// ------------------------------------------------------------------
// SchemaForm: auto-form from JSON Schema
// ------------------------------------------------------------------

function defaultForSchema(schema: JsonSchema | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!schema?.properties) return out;
  for (const [k, s] of Object.entries(schema.properties)) {
    if (s.default !== undefined) out[k] = s.default;
    else if (s.type === "boolean") out[k] = false;
    else if (s.type === "array") out[k] = [];
    else if (s.type === "object") out[k] = {};
    else out[k] = "";
  }
  return out;
}

function SchemaForm({
  schema,
  value,
  onChange,
  disabledFields,
}: {
  schema: JsonSchema | undefined;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabledFields?: string[];
}) {
  if (!schema?.properties) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Argumentos (JSON)</Label>
        <Textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value || "{}"));
            } catch {
              /* ignore parse errors while typing */
            }
          }}
          className="font-mono text-xs h-32"
        />
      </div>
    );
  }
  const required = new Set(schema.required ?? []);
  const entries = Object.entries(schema.properties);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([key, s]) => {
        const disabled = disabledFields?.includes(key);
        const label = (
          <Label htmlFor={`f-${key}`} className="text-xs flex items-center gap-1">
            {s.title ?? humanize(key)}
            {required.has(key) && <span className="text-destructive">*</span>}
          </Label>
        );
        const set = (v: unknown) => onChange({ ...value, [key]: v });
        const raw = value[key];

        // Enum
        if (Array.isArray(s.enum) && s.enum.length > 0) {
          return (
            <div key={key} className="space-y-1.5">
              {label}
              <Select
                value={raw === undefined || raw === null ? "" : String(raw)}
                onValueChange={(v) => set(v)}
                disabled={disabled}
              >
                <SelectTrigger id={`f-${key}`}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {s.enum.map((opt) => (
                    <SelectItem key={String(opt)} value={String(opt)}>
                      {String(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {s.description && <p className="text-[11px] text-muted-foreground">{s.description}</p>}
            </div>
          );
        }

        // Boolean
        if (s.type === "boolean") {
          return (
            <div key={key} className="space-y-1.5 flex flex-col justify-between rounded-md border border-white/10 p-3">
              <div className="flex items-center justify-between gap-3">
                {label}
                <Switch
                  id={`f-${key}`}
                  checked={!!raw}
                  onCheckedChange={(v) => set(v)}
                  disabled={disabled}
                />
              </div>
              {s.description && <p className="text-[11px] text-muted-foreground">{s.description}</p>}
            </div>
          );
        }

        // Number
        if (s.type === "integer" || s.type === "number") {
          return (
            <div key={key} className="space-y-1.5">
              {label}
              <Input
                id={`f-${key}`}
                type="number"
                value={raw === undefined || raw === null ? "" : String(raw)}
                onChange={(e) => {
                  const n = e.target.value === "" ? undefined : Number(e.target.value);
                  set(n);
                }}
                disabled={disabled}
              />
              {s.description && <p className="text-[11px] text-muted-foreground">{s.description}</p>}
            </div>
          );
        }

        // Array/Object → JSON textarea
        if (s.type === "array" || s.type === "object") {
          return (
            <div key={key} className="space-y-1.5 md:col-span-2">
              {label}
              <Textarea
                id={`f-${key}`}
                className="font-mono text-xs h-24"
                value={raw === undefined ? "" : JSON.stringify(raw, null, 2)}
                onChange={(e) => {
                  try {
                    set(JSON.parse(e.target.value || (s.type === "array" ? "[]" : "{}")));
                  } catch {
                    /* keep typing */
                  }
                }}
                disabled={disabled}
              />
              {s.description && <p className="text-[11px] text-muted-foreground">{s.description}</p>}
            </div>
          );
        }

        // String (long or short)
        const long =
          (s.description && s.description.length > 60) ||
          s.format === "textarea" ||
          key.match(/description|content|body|briefing|notes|prompt/i);
        return (
          <div key={key} className={`space-y-1.5 ${long ? "md:col-span-2" : ""}`}>
            {label}
            {long ? (
              <Textarea
                id={`f-${key}`}
                value={typeof raw === "string" ? raw : raw === undefined ? "" : JSON.stringify(raw)}
                onChange={(e) => set(e.target.value)}
                className="h-24"
                disabled={disabled}
              />
            ) : (
              <Input
                id={`f-${key}`}
                type={s.format === "date" ? "date" : s.format === "date-time" ? "datetime-local" : "text"}
                value={typeof raw === "string" ? raw : raw === undefined ? "" : String(raw)}
                onChange={(e) => set(e.target.value)}
                disabled={disabled}
              />
            )}
            {s.description && <p className="text-[11px] text-muted-foreground">{s.description}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export function McpResourceExplorer({
  provider,
  tools,
}: {
  provider: string;
  tools: Tool[];
}) {
  const groups = useMemo(() => groupTools(tools), [tools]);
  const [tab, setTab] = useState<string>(groups[0]?.resource ?? "");

  useEffect(() => {
    if (!tab && groups[0]) setTab(groups[0].resource);
  }, [groups, tab]);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma tool retornada por este MCP.</p>;
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList className="inline-flex w-auto">
          {groups.map((g) => (
            <TabsTrigger key={g.resource} value={g.resource} className="gap-2">
              {g.label}
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {Object.keys(g.tools).length + g.others.length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {groups.map((g) => (
        <TabsContent key={g.resource} value={g.resource} className="space-y-4">
          <ResourcePanel provider={provider} group={g} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

// ------------------------------------------------------------------
// One resource tab
// ------------------------------------------------------------------

function ResourcePanel({ provider, group }: { provider: string; group: ResourceGroup }) {
  const qc = useQueryClient();
  const callFn = useServerFn(callMcpTool);
  const [query, setQuery] = useState("");

  const listTool = group.tools.list;
  const createTool = group.tools.create;
  const getTool = group.tools.get;
  const updateTool = group.tools.update;
  const deleteTool = group.tools.delete;

  const listArgs = useMemo(() => defaultForSchema(listTool?.inputSchema), [listTool]);

  const listQ = useQuery({
    enabled: !!listTool,
    queryKey: ["mcp-list", provider, listTool?.name, listArgs],
    queryFn: async () => {
      const res = await callFn({
        data: {
          provider,
          name: listTool!.name,
          arguments: listArgs as Record<string, never>,
        },
      });
      return extractPayload(res.result);
    },
  });

  const rows = useMemo(() => {
    const r = toRows(listQ.data);
    if (!query.trim()) return r;
    const q = query.toLowerCase();
    return r.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)),
    );
  }, [listQ.data, query]);

  const cols = useMemo(() => pickColumns(rows), [rows]);

  const [creating, setCreating] = useState(false);
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);

  async function run(toolName: string, args: Record<string, unknown>) {
    const res = await callFn({
      data: { provider, name: toolName, arguments: args as Record<string, never> },
    });
    return extractPayload(res.result);
  }

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["mcp-list", provider, listTool?.name] });

  return (
    <section className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={listTool ? `Filtrar ${group.label.toLowerCase()}...` : "Sem listagem disponível"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!listTool}
            className="pl-8"
          />
        </div>
        {listTool && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => listQ.refetch()}
            disabled={listQ.isFetching}
            className="gap-2"
          >
            {listQ.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar
          </Button>
        )}
        {createTool && (
          <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        )}
      </div>

      {/* Table */}
      {listTool ? (
        listQ.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : listQ.error ? (
          <p className="text-sm text-destructive">
            Erro: {(listQ.error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed border-white/10 p-6 text-center">
            Nenhum registro encontrado.
          </p>
        ) : (
          <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {cols.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {humanize(c)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t border-white/5 hover:bg-white/[0.03]">
                      {cols.map((c) => (
                        <td key={c} className="px-3 py-2 align-top">
                          {fmtCell(row[c])}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setViewRow(row)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {updateTool && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditRow(row)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {deleteTool && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => setDeleteRow(row)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Este recurso não expõe uma tool de listagem.
        </p>
      )}

      {/* Other tools (ações extras não classificadas) */}
      {group.others.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {group.others.map((t) => (
            <QuickAction key={t.name} tool={t} onRun={(args) => run(t.name, args)} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {createTool && (
        <ActionDialog
          open={creating}
          onOpenChange={setCreating}
          title={`Novo ${humanize(group.resource).toLowerCase()}`}
          tool={createTool}
          initialValue={defaultForSchema(createTool.inputSchema)}
          submitLabel="Criar"
          onSubmit={async (args) => {
            await run(createTool.name, args);
            toast.success("Registro criado.");
            invalidate();
          }}
        />
      )}

      {/* View dialog */}
      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes</DialogTitle>
            <DialogDescription>Registro completo retornado pelo MCP.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-black/30 p-3 text-xs leading-snug">
            {viewRow ? JSON.stringify(viewRow, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {updateTool && editRow && (
        <ActionDialog
          open={!!editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          title={`Editar ${humanize(group.resource).toLowerCase()}`}
          tool={updateTool}
          initialValue={mergeInto(defaultForSchema(updateTool.inputSchema), editRow)}
          submitLabel="Salvar"
          onSubmit={async (args) => {
            await run(updateTool.name, args);
            toast.success("Registro atualizado.");
            invalidate();
          }}
        />
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTool || !deleteRow) return;
                const args = mergeInto(defaultForSchema(deleteTool.inputSchema), deleteRow);
                try {
                  await run(deleteTool.name, args);
                  toast.success("Excluído.");
                  invalidate();
                } catch (e) {
                  toast.error((e as Error).message);
                }
                setDeleteRow(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function mergeInto(
  template: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...template };
  for (const key of Object.keys(template)) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  // Also carry id if present
  for (const idKey of ["id", "uuid", "slug"]) {
    if (source[idKey] !== undefined && out[idKey] === undefined) out[idKey] = source[idKey];
  }
  return out;
}

// ------------------------------------------------------------------
// Action dialog (used for create/edit)
// ------------------------------------------------------------------

function ActionDialog({
  open,
  onOpenChange,
  title,
  tool,
  initialValue,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  tool: Tool;
  initialValue: Record<string, unknown>;
  submitLabel: string;
  onSubmit: (args: Record<string, unknown>) => Promise<void>;
}) {
  const [value, setValue] = useState<Record<string, unknown>>(initialValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setBusy(true);
    try {
      await onSubmit(cleanEmpty(value));
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {tool.description && <DialogDescription>{tool.description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">
          <SchemaForm schema={tool.inputSchema} value={value} onChange={setValue} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cleanEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

// ------------------------------------------------------------------
// Extra ("outras") action button — for tools that don't map to CRUD
// ------------------------------------------------------------------

function QuickAction({
  tool,
  onRun,
}: {
  tool: Tool;
  onRun: (args: Record<string, unknown>) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
        className="gap-2"
      >
        <Play className="h-4 w-4" />
        {tool.title ?? humanize(tool.name)}
      </Button>
      <ActionDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setResult(null);
        }}
        title={tool.title ?? humanize(tool.name)}
        tool={tool}
        initialValue={defaultForSchema(tool.inputSchema)}
        submitLabel={busy ? "Executando..." : "Executar"}
        onSubmit={async (args) => {
          setBusy(true);
          try {
            const r = await onRun(args);
            setResult(JSON.stringify(r, null, 2));
            toast.success("Executado.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {result && (
        <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Resultado</DialogTitle>
            </DialogHeader>
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-black/30 p-3 text-xs">
              {result}
            </pre>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
