import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { adminCreateAnnouncement } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/comunicados")({
  head: () => ({ meta: [{ title: "Comunicados — Administração" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState("normal");
  const [type, setType] = useState("announcement");
  const [action_url, setActionUrl] = useState("");

  const m = useMutation({
    mutationFn: () => adminCreateAnnouncement({ data: { title, content, priority: priority as any, type: type as any, action_url, published: true } }),
    onSuccess: () => { toast.success("Comunicado publicado."); setTitle(""); setContent(""); setActionUrl(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl space-y-4">
      <Card><CardContent className="p-6 space-y-4">
        <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label>Conteúdo</Label><Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Comunicado</SelectItem>
                <SelectItem value="info">Informativo</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="success">Boa notícia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2"><Label>Link (opcional)</Label><Input value={action_url} onChange={(e) => setActionUrl(e.target.value)} placeholder="https://…" /></div>
        <Button onClick={() => m.mutate()} disabled={!title || !content || m.isPending}>Publicar</Button>
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">
        Segmentação por empresa, papel ou aplicação e agendamento serão adicionados em uma próxima iteração.
      </p>
    </div>
  );
}
