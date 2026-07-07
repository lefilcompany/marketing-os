import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTeam, updateMemberRole, setMemberStatus, removeMember } from "@/lib/team.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Users, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe — Marketing OS" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["team", currentOrgId],
    queryFn: () => listTeam({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const roleM = useMutation({
    mutationFn: (v: { memberId: string; role: any }) => updateMemberRole({ data: v }),
    onSuccess: () => { toast.success("Função atualizada."); qc.invalidateQueries({ queryKey: ["team", currentOrgId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusM = useMutation({
    mutationFn: (v: { memberId: string; status: any }) => setMemberStatus({ data: v }),
    onSuccess: () => { toast.success("Status atualizado."); qc.invalidateQueries({ queryKey: ["team", currentOrgId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const removeM = useMutation({
    mutationFn: (memberId: string) => removeMember({ data: { memberId } }),
    onSuccess: () => { toast.success("Membro removido."); qc.invalidateQueries({ queryKey: ["team", currentOrgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie membros e permissões desta empresa.</p>
        </div>
        <Button disabled title="Convites por e-mail estarão disponíveis em breve.">
          <UserPlus className="h-4 w-4" />Convidar (em breve)
        </Button>
      </div>

      <Card><CardContent className="p-0">
        {q.data && q.data.members.length === 0 && (
          <div className="p-10 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Nenhum membro além de você.</p>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entrou em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data?.members.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarImage src={m.profile?.avatar_url ?? undefined} /><AvatarFallback>{(m.profile?.full_name ?? m.profile?.email ?? "?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <div className="text-sm font-medium">{m.profile?.full_name ?? "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground">{m.profile?.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={m.role} onValueChange={(v) => roleM.mutate({ memberId: m.id, role: v })}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org_admin">Admin</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status === "active" ? "Ativo" : m.status === "disabled" ? "Desativado" : "Convidado"}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {m.joined_at ? format(new Date(m.joined_at), "dd MMM yyyy", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => statusM.mutate({ memberId: m.id, status: m.status === "active" ? "disabled" : "active" })}>
                      {m.status === "active" ? "Desativar" : "Ativar"}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive">Remover</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover este membro?</AlertDialogTitle>
                          <AlertDialogDescription>A conta global não é apagada; só o vínculo com esta empresa.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeM.mutate(m.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
