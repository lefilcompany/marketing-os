import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListApps, adminUpsertApp } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, LayoutGrid } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/aplicacoes")({
  head: () => ({ meta: [{ title: "Aplicações — Administração" }, { name: "robots", content: "noindex" }] }),
  component: AdminApps,
});

function AdminApps() {
  const q = useQuery({ queryKey: ["admin-apps"], queryFn: () => adminListApps() });
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Catálogo completo do Marketing OS.</p>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Nova aplicação</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Status</TableHead><TableHead>Visível</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {q.data?.items.map((a: any) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded" style={{ background: a.accent_color ?? "var(--muted)" }} />
                    <span className="font-medium">{a.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.category}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                <TableCell>{a.is_visible ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>Editar</Button></TableCell>
              </TableRow>
            ))}
            {q.data && q.data.items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center p-10">
                <LayoutGrid className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Nenhuma aplicação.</p>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
      {open && <AppEditor initial={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function AppEditor({ initial, onClose }: { initial: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<any>(initial ?? {
    name: "", slug: "", short_description: "", full_description: "",
    category: "operations", external_url: "", support_url: "",
    accent_color: "#6366F1", icon: "Sparkles",
    status: "available", connection_mode: "external_link", open_mode: "new_tab",
    allowed_domains: [] as string[], is_visible: true, is_featured: false, is_new: false, sort_order: 100,
  });
  const [domains, setDomains] = useState<string>((initial?.allowed_domains ?? []).join(", "));

  const save = useMutation({
    mutationFn: () => adminUpsertApp({ data: {
      ...f,
      support_url: f.support_url || undefined,
      allowed_domains: domains.split(",").map((d: string) => d.trim()).filter(Boolean),
    } }),
    onSuccess: () => { toast.success("Aplicação salva."); qc.invalidateQueries({ queryKey: ["admin-apps"] }); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar aplicação" : "Nova aplicação"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Nome</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></div>
          </div>
          <div className="space-y-2"><Label>Descrição curta</Label><Input value={f.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} /></div>
          <div className="space-y-2"><Label>Descrição completa</Label><Textarea rows={4} value={f.full_description ?? ""} onChange={(e) => set("full_description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Categoria</Label>
              <Select value={f.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategy">Estratégia</SelectItem>
                  <SelectItem value="content">Conteúdo</SelectItem>
                  <SelectItem value="operations">Operação</SelectItem>
                  <SelectItem value="data_performance">Dados & Performance</SelectItem>
                  <SelectItem value="artificial_intelligence">IA</SelectItem>
                  <SelectItem value="research_audience">Pesquisa & Audiência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="unstable">Instável</SelectItem>
                  <SelectItem value="maintenance">Em manutenção</SelectItem>
                  <SelectItem value="unavailable">Indisponível</SelectItem>
                  <SelectItem value="coming_soon">Em breve</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>URL externa</Label><Input value={f.external_url} onChange={(e) => set("external_url", e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-2"><Label>URL de suporte</Label><Input value={f.support_url ?? ""} onChange={(e) => set("support_url", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Domínios permitidos (separe por vírgula)</Label>
            <Input value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="pla.creator.lefil.com.br" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Cor de destaque</Label><Input value={f.accent_color ?? ""} onChange={(e) => set("accent_color", e.target.value)} placeholder="#8B5CF6" /></div>
            <div className="space-y-2"><Label>Ícone (Lucide)</Label><Input value={f.icon ?? ""} onChange={(e) => set("icon", e.target.value)} /></div>
            <div className="space-y-2"><Label>Ordem</Label><Input type="number" value={f.sort_order ?? 0} onChange={(e) => set("sort_order", Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Modo de conexão</Label>
              <Select value={f.connection_mode} onValueChange={(v) => set("connection_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_link">Link externo</SelectItem>
                  <SelectItem value="authenticated_link">Link autenticado</SelectItem>
                  <SelectItem value="sso">SSO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Abrir em</Label>
              <Select value={f.open_mode} onValueChange={(v) => set("open_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_tab">Nova aba</SelectItem>
                  <SelectItem value="same_tab">Mesma aba</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2"><Switch checked={!!f.is_visible} onCheckedChange={(v) => set("is_visible", v)} /><Label>Visível</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!f.is_featured} onCheckedChange={(v) => set("is_featured", v)} /><Label>Destaque</Label></div>
            <div className="flex items-center gap-2"><Switch checked={!!f.is_new} onCheckedChange={(v) => set("is_new", v)} /><Label>Novo</Label></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !f.name || !f.slug || !f.external_url}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
