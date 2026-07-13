import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  useProfile,
  useUpdateProfile,
  useClienteList,
  useCreateCliente,
} from "@/hooks/use-lekpis-queries";
import { useClienteAtivo } from "@/contexts/cliente-ativo-context";
import { startMcpAuth, getMcpConnection, disconnectMcp } from "@/lib/mcp.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, Plus, Loader2, Plug, Unplug, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/lekpis/perfil")({
  head: () => ({ meta: [{ title: "Perfil — LeKPIs" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const { data: profile, isLoading } = useProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    estado: "",
    cidade: "",
    tipo_empresa: "",
    volume_clientes: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      nome: profile.nome ?? "",
      telefone: profile.telefone ?? "",
      estado: profile.estado ?? "",
      cidade: profile.cidade ?? "",
      tipo_empresa: profile.tipo_empresa ?? "",
      volume_clientes: profile.volume_clientes ?? "",
    });
  }, [profile]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Perfil</p>
        <h1 className="lekpis-display mt-1 text-2xl font-semibold tracking-tight">
          Seus dados
        </h1>
      </div>

      <section className="lekpis-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(form);
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Nome">
            <Input value={form.nome} onChange={set("nome")} disabled={isLoading} />
          </Field>
          <Field label="Telefone">
            <Input value={form.telefone} onChange={set("telefone")} disabled={isLoading} />
          </Field>
          <Field label="Estado">
            <Input value={form.estado} onChange={set("estado")} disabled={isLoading} />
          </Field>
          <Field label="Cidade">
            <Input value={form.cidade} onChange={set("cidade")} disabled={isLoading} />
          </Field>
          <Field label="Tipo de empresa">
            <Input value={form.tipo_empresa} onChange={set("tipo_empresa")} disabled={isLoading} />
          </Field>
          <Field label="Volume de clientes">
            <Input value={form.volume_clientes} onChange={set("volume_clientes")} disabled={isLoading} />
          </Field>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </section>

      <ClientesSection />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ClientesSection() {
  const { data, isLoading } = useClienteList();
  const { clienteId, setClienteId } = useClienteAtivo();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const create = useCreateCliente();

  const submit = async () => {
    if (!nome.trim()) return;
    const result = await create.mutateAsync({ nome });
    const newId = (result as any)?.id ?? (result as any)?.items?.[0]?.id;
    if (newId) setClienteId(newId);
    setOpen(false);
    setNome("");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="lekpis-display text-lg font-semibold">Meus clientes</h2>
          <p className="text-sm text-muted-foreground">
            O cliente ativo determina quais dados aparecem no painel.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={create.isPending || !nome.trim()}>
                {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="lekpis-card p-0 divide-y divide-black/5">
        {isLoading ? (
          <div className="p-4 lekpis-shimmer h-16" />
        ) : (
          (data?.items ?? []).map((c) => {
            const active = c.id === clienteId;
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{c.nome ?? c.id}</p>
                  {active && (
                    <p className="text-[11px] uppercase tracking-wider text-[oklch(0.55_0.14_65)]">
                      Cliente ativo
                    </p>
                  )}
                </div>
                {active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5" /> Ativo
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setClienteId(c.id)}>
                    Definir como ativo
                  </Button>
                )}
              </div>
            );
          })
        )}
        {!isLoading && (data?.items ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </div>
        )}
      </div>
    </section>
  );
}
