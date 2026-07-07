import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFullCatalog, toggleFavorite } from "@/lib/workspace.functions";
import { resolveAppRedirect, requestAccess } from "@/lib/applications.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AppIcon, categoryLabel } from "./dashboard";
import { Search, Star, StarOff, ExternalLink, Lock, Grid3x3, List } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aplicacoes")({
  head: () => ({ meta: [{ title: "Aplicações — Marketing OS" }] }),
  component: AppsPage,
});

function AppsPage() {
  const { currentOrgId } = useWorkspace();
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["catalog", currentOrgId],
    queryFn: () => getFullCatalog({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [reqApp, setReqApp] = useState<any>(null);
  const [reason, setReason] = useState("");

  const filtered = useMemo(() => {
    const apps = q.data?.apps ?? [];
    return apps.filter((a: any) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && a.category !== category) return false;
      if (availability === "included" && !a.included) return false;
      if (availability === "not_included" && a.included) return false;
      return true;
    });
  }, [q.data, search, category, availability]);

  const fav = useMutation({
    mutationFn: (id: string) => toggleFavorite({ data: { organizationId: currentOrgId!, applicationId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", currentOrgId] }),
  });

  const openApp = useMutation({
    mutationFn: (id: string) => resolveAppRedirect({ data: { organizationId: currentOrgId!, applicationId: id } }),
    onSuccess: (r) => {
      if (r.openMode === "same_tab") window.location.href = r.url;
      else window.open(r.url, "_blank", "noopener,noreferrer");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const req = useMutation({
    mutationFn: (payload: { applicationId: string; reason: string }) =>
      requestAccess({ data: { organizationId: currentOrgId!, applicationId: payload.applicationId, reason: payload.reason } }),
    onSuccess: () => { toast.success("Solicitação enviada."); setReqApp(null); setReason(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Aplicações</h1>
        <p className="text-sm text-muted-foreground mt-1">Todos os módulos do ecossistema Marketing OS.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aplicação…" className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-52"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="strategy">Estratégia</SelectItem>
            <SelectItem value="content">Conteúdo</SelectItem>
            <SelectItem value="operations">Operação</SelectItem>
            <SelectItem value="data_performance">Dados & Performance</SelectItem>
            <SelectItem value="artificial_intelligence">IA</SelectItem>
            <SelectItem value="research_audience">Pesquisa & Audiência</SelectItem>
          </SelectContent>
        </Select>
        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="included">Incluídas no plano</SelectItem>
            <SelectItem value="not_included">Não contratadas</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <button onClick={() => setView("grid")} className={`px-3 ${view === "grid" ? "bg-accent" : ""}`} aria-label="Grade"><Grid3x3 className="h-4 w-4" /></button>
          <button onClick={() => setView("list")} className={`px-3 ${view === "list" ? "bg-accent" : ""}`} aria-label="Lista"><List className="h-4 w-4" /></button>
        </div>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {filtered.length === 0 && !q.isLoading && (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhuma aplicação encontrada.</CardContent></Card>
      )}

      {view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a: any) => (
            <Card key={a.id} className="group relative overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all"
                  style={{ borderTop: `3px solid ${a.accent_color ?? "var(--primary)"}` }}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <AppIcon app={a} />
                  {a.included && (
                    <button onClick={() => fav.mutate(a.id)} className="text-muted-foreground hover:text-foreground">
                      {a.isFavorite ? <Star className="h-4 w-4 fill-warning text-warning" /> : <StarOff className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <CardTitle className="font-display text-base pt-2 flex items-center gap-2">
                  {a.name}
                  {!a.included && <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />Não incluído</Badge>}
                </CardTitle>
                <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-wider">{categoryLabel(a.category)}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{a.short_description}</p>
                <div className="flex gap-2">
                  {a.included ? (
                    <>
                      <Button size="sm" className="flex-1" onClick={() => openApp.mutate(a.id)}>
                        <ExternalLink className="h-4 w-4" />Abrir aplicação
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => nav({ to: "/aplicacoes/$slug", params: { slug: a.slug } })}>Detalhes</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setReqApp(a)}>Solicitar acesso</Button>
                      <Button size="sm" variant="ghost" onClick={() => nav({ to: "/aplicacoes/$slug", params: { slug: a.slug } })}>Ver</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><div className="divide-y">
          {filtered.map((a: any) => (
            <div key={a.id} className="p-4 flex items-center gap-4">
              <AppIcon app={a} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm">{a.name}</div>
                  {!a.included && <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />Não incluído</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">{a.short_description}</div>
              </div>
              <Badge variant="outline" className="text-[10px] hidden md:inline-flex">{categoryLabel(a.category)}</Badge>
              {a.included ? (
                <Button size="sm" onClick={() => openApp.mutate(a.id)}><ExternalLink className="h-4 w-4" />Abrir</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setReqApp(a)}>Solicitar</Button>
              )}
            </div>
          ))}
        </div></Card>
      )}

      <Dialog open={!!reqApp} onOpenChange={(v) => !v && setReqApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar acesso a {reqApp?.name}</DialogTitle>
            <DialogDescription>Seu administrador será notificado. Você pode adicionar uma justificativa opcional.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Por que você precisa dessa plataforma?" rows={4} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReqApp(null)}>Cancelar</Button>
            <Button onClick={() => reqApp && req.mutate({ applicationId: reqApp.id, reason })} disabled={req.isPending}>
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
