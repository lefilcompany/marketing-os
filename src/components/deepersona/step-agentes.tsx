import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/lib/workspace-context";
import { listPersonas } from "@/lib/personas.functions";
import {
  listAgents, generateAgentFromPersona, deleteAgent, chatWithAgent,
} from "@/lib/agents.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Brain, Sparkles, Loader2, Plus, MessageCircle, Trash2, Send, User2 } from "lucide-react";
import { toast } from "sonner";

type AgentRow = {
  id: string;
  persona_id: string;
  name: string;
  role: string | null;
  tone: string | null;
  system_prompt: string;
  capabilities: unknown;
  starter_questions: unknown;
  status: string;
  personas?: { id: string; name: string; role: string | null } | null;
};

export function StepAgentes({
  moduleColor,
  onAutoComplete,
}: {
  moduleColor: string;
  onAutoComplete: () => void;
}) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();

  const personasQ = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const agentsQ = useQuery({
    queryKey: ["agents", currentOrgId],
    queryFn: () => listAgents({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const personas = personasQ.data?.items ?? [];
  const agents = (agentsQ.data?.items ?? []) as AgentRow[];

  const [open, setOpen] = useState(false);
  const [personaId, setPersonaId] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [chatWith, setChatWith] = useState<AgentRow | null>(null);
  const [hasChatted, setHasChatted] = useState(false);

  useEffect(() => { if (hasChatted) onAutoComplete(); }, [hasChatted, onAutoComplete]);

  const create = useMutation({
    mutationFn: () => generateAgentFromPersona({ data: { personaId, purpose: purpose.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Agente criado");
      qc.invalidateQueries({ queryKey: ["agents", currentOrgId] });
      setOpen(false); setPersonaId(""); setPurpose("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteAgent({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents", currentOrgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={personas.length === 0}>
              <Plus className="h-4 w-4" /> Novo agente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar agente a partir de persona</DialogTitle>
              <DialogDescription>A IA transforma a persona em um agente conversacional.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Persona</Label>
                <Select value={personaId} onValueChange={setPersonaId}>
                  <SelectTrigger><SelectValue placeholder="Escolha uma persona" /></SelectTrigger>
                  <SelectContent>
                    {personas.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.role ? ` · ${p.role}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Propósito (opcional)</Label>
                <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex.: entrevistar sobre onboarding..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!personaId || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1.5" /> Gerar agente</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {agentsQ.isLoading ? (
        <Skeleton className="h-40" />
      ) : personas.length === 0 ? (
        <div className="surface-card p-10 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Crie personas antes de gerar agentes.</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="surface-card p-10 text-center space-y-3">
          <Brain className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="font-medium">Nenhum agente ainda</h3>
          <p className="text-sm text-muted-foreground">Gere um agente a partir de uma persona para conversar.</p>
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {agents.map((a) => {
            const caps = Array.isArray(a.capabilities) ? (a.capabilities as string[]) : [];
            const starters = Array.isArray(a.starter_questions) ? (a.starter_questions as string[]) : [];
            return (
              <article key={a.id} className="surface-card group relative overflow-hidden p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-2xl text-white font-display font-semibold"
                    style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${moduleColor} 65%, transparent), color-mix(in oklab, ${moduleColor} 25%, transparent))` }}
                  >
                    {a.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold truncate">{a.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{a.role}</p>
                    {a.personas && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <User2 className="h-3 w-3" /> {a.personas.name}
                      </p>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)} className="opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {a.tone && <p className="text-xs italic text-muted-foreground">Tom: {a.tone}</p>}
                {caps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {caps.slice(0, 4).map((c, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                )}
                {starters.length > 0 && (
                  <p className="text-xs text-muted-foreground line-clamp-2">💬 "{starters[0]}"</p>
                )}
                <div className="pt-2 border-t border-white/5">
                  <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setChatWith(a)}>
                    <MessageCircle className="h-3.5 w-3.5" /> Conversar
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <ChatPanel agent={chatWith} onClose={() => setChatWith(null)} onMessage={() => setHasChatted(true)} />
    </div>
  );
}

function ChatPanel({
  agent, onClose, onMessage,
}: {
  agent: AgentRow | null;
  onClose: () => void;
  onMessage: () => void;
}) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (agent) setMessages([]); }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: (msgs: typeof messages) => chatWithAgent({ data: { agentId: agent!.id, messages: msgs } }),
    onSuccess: (r) => setMessages((m) => [...m, { role: "assistant", content: r.reply }]),
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (text: string) => {
    if (!text.trim() || !agent) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next);
    setInput("");
    onMessage();
    send.mutate(next);
  };

  const starters = agent && Array.isArray(agent.starter_questions) ? (agent.starter_questions as string[]) : [];

  return (
    <Sheet open={!!agent} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-5 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />{agent?.name}</SheetTitle>
          {agent?.role && <p className="text-xs text-muted-foreground">{agent.role}</p>}
        </SheetHeader>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
          {messages.length === 0 && starters.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Sugestões para começar:</p>
              {starters.slice(0, 4).map((s, i) => (
                <button key={i} onClick={() => submit(s)} className="block w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-sm transition">
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white/[0.06] border border-white/10"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {send.isPending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1.5" /> digitando...
              </div>
            </div>
          )}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="border-t border-white/10 p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escreva uma pergunta..." disabled={send.isPending} />
          <Button type="submit" size="icon" disabled={!input.trim() || send.isPending}><Send className="h-4 w-4" /></Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
