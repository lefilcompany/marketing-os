import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Wrench, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/orquestrador")({
  head: () => ({ meta: [{ title: "Orquestrador — Marketing OS" }] }),
  component: OrquestradorPage,
});

function OrquestradorPage() {
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(init?.headers);
          if (data.session?.access_token) {
            headers.set("Authorization", `Bearer ${data.session.access_token}`);
          }
          return fetch(input, { ...init, headers });
        },
      }),
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => console.error("[chat] error:", err),
  });

  const [input, setInput] = useState("");
  const isBusy = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#F6F9FC] flex flex-col">
      <header className="border-b bg-white/70 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">Orquestrador</h1>
            <p className="text-xs text-muted-foreground">
              Chat com Gemini 3.5 Flash · aciona tools MCP das plataformas conectadas
            </p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
          {messages.length === 0 && <EmptyState />}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {isBusy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Pensando…
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Erro na conversa</p>
                <p className="text-xs opacity-80">{error.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-white/80 backdrop-blur px-6 py-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Pergunte, planeje um ciclo AEIOU, ou peça dados de uma aplicação conectada…"
            className="min-h-[52px] max-h-40 resize-none"
            disabled={isBusy}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isBusy} className="h-[52px] w-[52px] shrink-0">
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mx-auto max-w-4xl text-[10px] uppercase tracking-wider text-muted-foreground mt-2">
          Enter envia · Shift+Enter quebra linha
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  const examples = [
    "Quais personas eu tenho no DeePersona?",
    "Liste os projetos ativos no Soma.",
    "Qual campanha está em execução no Creator?",
    "Mostre os KPIs que não estão atingindo a meta.",
  ];
  return (
    <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-3">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="font-display text-lg font-semibold">Como posso ajudar?</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Sou o orquestrador AEIOU. Uso as ferramentas MCP das suas plataformas conectadas para
        responder com evidência.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 mt-6 text-left">
        {examples.map((e) => (
          <div
            key={e}
            className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-white border border-border/70 text-foreground"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div key={i} className={isUser ? "" : "prose prose-sm max-w-none"}>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{part.text}</p>
                ) : (
                  <ReactMarkdown>{part.text}</ReactMarkdown>
                )}
              </div>
            );
          }
          if (part.type?.startsWith?.("tool-")) {
            return <ToolPart key={i} part={part as ToolLikePart} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

type ToolLikePart = {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolPart({ part }: { part: ToolLikePart }) {
  const [open, setOpen] = useState(false);
  const name = part.toolName ?? part.type.replace(/^tool-/, "");
  const [provider, ...rest] = name.split("__");
  const toolName = rest.join("__") || name;
  const isRunning = part.state === "input-streaming" || part.state === "input-available";
  const isDone = part.state === "output-available";
  const isError = part.state === "output-error";

  return (
    <div className="my-2 rounded-lg border border-border/60 bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Badge variant="secondary" className="text-[10px] uppercase">
          {provider}
        </Badge>
        <span className="font-mono text-[11px] truncate flex-1">{toolName}</span>
        <span className="text-[10px] text-muted-foreground">
          {isRunning && "executando…"}
          {isDone && "concluído"}
          {isError && "erro"}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/60 p-3 space-y-2">
          {part.input !== undefined && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Entrada
              </div>
              <pre className="text-[11px] bg-white/60 rounded p-2 overflow-x-auto">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {part.output !== undefined && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Evidência (saída)
              </div>
              <pre className="text-[11px] bg-white/60 rounded p-2 overflow-x-auto max-h-64">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
          {part.errorText && (
            <p className="text-[11px] text-destructive">{part.errorText}</p>
          )}
        </div>
      )}
    </div>
  );
}
