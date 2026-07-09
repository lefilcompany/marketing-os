import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ModuleShell } from "@/components/module-shell";
import { getModule } from "@/lib/modules";
import { useWorkspace } from "@/lib/workspace-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { exportTasksCsv, importTasksCsv, listProjects } from "@/lib/tasks.functions";

export const Route = createFileRoute("/_authenticated/soma")({
  head: () => ({ meta: [{ title: "Soma — Marketing OS" }] }),
  component: SomaPage,
});

function SomaPage() {
  const mod = getModule("soma")!;
  return (
    <div>
      <ModuleShell module={mod} />
      <div className="mx-auto max-w-6xl px-6 pb-14 -mt-6">
        <TasksCsvPanel />
      </div>
    </div>
  );
}

function TasksCsvPanel() {
  const { currentOrgId } = useWorkspace();
  const [projectId, setProjectId] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastImport, setLastImport] = useState<{ updated: number; skipped: number; errors: string[] } | null>(null);

  const projectsQ = useQuery({
    queryKey: ["soma-projects", currentOrgId],
    queryFn: () => listProjects({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const exportM = useMutation({
    mutationFn: () =>
      exportTasksCsv({
        data: {
          organizationId: currentOrgId!,
          projectId: projectId === "all" ? null : projectId,
        },
      }),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soma-tarefas-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${res.count} tarefas.`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao exportar."),
  });

  const importM = useMutation({
    mutationFn: (csv: string) =>
      importTasksCsv({ data: { organizationId: currentOrgId!, csv } }),
    onSuccess: (res) => {
      setLastImport(res);
      if (res.updated > 0) toast.success(`${res.updated} tarefa(s) atualizada(s).`);
      else toast.info("Nenhuma tarefa foi atualizada.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao importar."),
  });

  const onFile = async (f: File | null | undefined) => {
    if (!f) return;
    const text = await f.text();
    importM.mutate(text);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <section className="surface-card p-6 space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15"
               style={{ background: "color-mix(in oklab, var(--brand-soma) 30%, transparent)" }}>
            <FileSpreadsheet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Sincronizar tarefas via CSV</h2>
            <p className="text-sm text-muted-foreground">
              Exporte para editar em planilha ou sistema externo e reimporte para aplicar as mudanças.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Download className="h-4 w-4" /> Exportar
          </div>
          <div className="flex items-center gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Projeto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {(projectsQ.data?.items ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => exportM.mutate()}
              disabled={!currentOrgId || exportM.isPending}
            >
              <Download className="h-4 w-4" />
              {exportM.isPending ? "Gerando…" : "Baixar CSV"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Colunas: <code>id, title, status, due_at, project_id, project_name, description</code>.
          </p>
        </div>

        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Upload className="h-4 w-4" /> Importar atualizações
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:opacity-90"
            onChange={(e) => onFile(e.target.files?.[0])}
            disabled={!currentOrgId || importM.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Apenas linhas com <code>id</code> existente são atualizadas. Novos ids são ignorados.
            Status válidos: <code>todo, in_progress, blocked, review, done</code>. Datas em <code>YYYY-MM-DD</code>.
          </p>
        </div>
      </div>

      {lastImport && (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Badge className="gap-1" variant="secondary">
              <CheckCircle2 className="h-3.5 w-3.5" /> {lastImport.updated} atualizadas
            </Badge>
            <Badge variant="outline">{lastImport.skipped} ignoradas</Badge>
            {lastImport.errors.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {lastImport.errors.length} erros
              </Badge>
            )}
          </div>
          {lastImport.errors.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
              {lastImport.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
