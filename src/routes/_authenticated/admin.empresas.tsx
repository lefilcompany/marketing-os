import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListOrgs, adminCreateOrg, adminUpdateOrg, adminOrgDetails, adminSetOrgApp, adminListApps } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Administração" }, { name: "robots", content: "noindex" }] }),
  component: AdminOrgs,
});

function AdminOrgs() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-orgs"], queryFn: () => adminListOrgs() });
  const [selected, setSelected] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Todas as empresas do Marketing OS.</p>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Nova empresa</Button></DialogTrigger>
          <CreateOrgDialog onCreated={() => { setOpenCreate(false); qc.invalidateQueries({ queryKey: ["admin-orgs"] }); }} />
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Plano</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {q.data?.items.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{o.slug}</TableCell>
                <TableCell><Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-xs">{o.plan ?? "—"}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setSelected(o.id)}>Gerenciar</Button></TableCell>
              </TableRow>
            ))}
            {q.data && q.data.items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center p-10">
                <Building2 className="h-6 w-6 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Nenhuma empresa cadastrada.</p>
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      {selected && <OrgDetailsDialog id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CreateOrgDialog({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("");
  const m = useMutation({
    mutationFn: () => adminCreateOrg({ data: { name, slug, plan: plan || undefined } }),
    onSuccess: () => { toast.success("Empresa criada."); onCreated(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova empresa</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Slug (a-z, 0-9, hífen)</Label><Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></div>
        <div className="space-y-2"><Label>Plano (opcional)</Label><Input value={plan} onChange={(e) => setPlan(e.target.value)} /></div>
      </div>
      <DialogFooter><Button onClick={() => m.mutate()} disabled={!name || !slug || m.isPending}>Criar</Button></DialogFooter>
    </DialogContent>
  );
}

function OrgDetailsDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-org", id], queryFn: () => adminOrgDetails({ data: { organizationId: id } }) });
  const apps = useQuery({ queryKey: ["admin-apps"], queryFn: () => adminListApps() });

  const setApp = useMutation({
    mutationFn: (v: { applicationId: string; enabled: boolean }) => adminSetOrgApp({ data: { organizationId: id, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-org", id] }),
  });
  const updateOrg = useMutation({
    mutationFn: (payload: any) => adminUpdateOrg({ data: { id, ...payload } }),
    onSuccess: () => { toast.success("Empresa atualizada."); qc.invalidateQueries({ queryKey: ["admin-orgs"] }); qc.invalidateQueries({ queryKey: ["admin-org", id] }); },
  });

  const org = q.data?.org;
  const enabledSet = new Set((q.data?.enabledApps ?? []).map((e: any) => e.application_id));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{org?.name ?? "Empresa"}</DialogTitle></DialogHeader>
        {org && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={org.status} onValueChange={(v) => updateOrg.mutate({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="suspended">Suspensa</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Plano</Label>
                <Input defaultValue={org.plan ?? ""} onBlur={(e) => e.target.value !== org.plan && updateOrg.mutate({ plan: e.target.value })} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Aplicações liberadas</h4>
              <div className="space-y-2">
                {apps.data?.items.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.short_description}</div>
                    </div>
                    <Switch
                      checked={enabledSet.has(a.id)}
                      onCheckedChange={(v) => setApp.mutate({ applicationId: a.id, enabled: v })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Membros ({q.data?.members.length ?? 0})</h4>
              <div className="text-xs text-muted-foreground">Gestão detalhada dos membros ocorre na página Equipe do workspace da empresa.</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
