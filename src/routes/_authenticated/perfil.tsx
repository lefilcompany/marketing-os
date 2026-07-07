import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getSessionBootstrap, updateProfile } from "@/lib/workspace.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — Marketing OS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const q = useQuery({ queryKey: ["session-bootstrap"], queryFn: () => getSessionBootstrap() });
  const [full_name, setFullName] = useState("");
  const [job_title, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (q.data?.profile) {
      setFullName(q.data.profile.full_name ?? "");
      setJobTitle(q.data.profile.job_title ?? "");
      setPhone(q.data.profile.phone ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => updateProfile({ data: { full_name, job_title, phone, onboarding_completed: true } }),
    onSuccess: () => { toast.success("Perfil atualizado."); q.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const p = q.data?.profile;

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Atualize suas informações.</p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={p?.avatar_url ?? undefined} />
              <AvatarFallback>{(full_name || p?.email || "?").slice(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{p?.email}</div>
              <div className="text-xs text-muted-foreground">Usuário Marketing OS</div>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={full_name} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={job_title} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button type="submit" disabled={save.isPending}>Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
