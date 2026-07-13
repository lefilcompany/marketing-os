import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";
import {
  listCsdItems,
  createCsdItem,
  deleteCsdItem,
  generateCsdSuggestions,
} from "@/lib/csd.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle, HelpCircle, AlertTriangle, Sparkles, Plus, Trash2, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Category = "certainty" | "assumption" | "doubt";

const CATEGORIES: Array<{
  id: Category;
  title: string;
  description: string;
  icon: typeof CheckCircle;
  ring: string;
  chip: string;
  glow: string;
}> = [
  { id: "certainty", title: "Certezas", description: "O que já sabemos", icon: CheckCircle, ring: "ring-emerald-400/30", chip: "bg-emerald-500/15 text-emerald-300", glow: "oklch(0.75 0.15 155)" },
  { id: "assumption", title: "Suposições", description: "O que precisa ser validado", icon: HelpCircle, ring: "ring-amber-400/30", chip: "bg-amber-500/15 text-amber-300", glow: "oklch(0.78 0.14 75)" },
  { id: "doubt", title: "Dúvidas", description: "Perguntas em aberto", icon: AlertTriangle, ring: "ring-rose-400/30", chip: "bg-rose-500/15 text-rose-300", glow: "oklch(0.72 0.18 20)" },
];

export function StepCsd({ onAutoComplete }: { onAutoComplete: () => void }) {
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const [active, setActive] = useState<Category>("certainty");
  const [text, setText] = useState("");
  const [businessContext, setBusinessContext] = useState("");

  const list = useQuery({
    queryKey: ["csd", currentOrgId],
    queryFn: () => listCsdItems({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });
  const items = list.data?.items ?? [];
  const byCategory = (c: Category) => items.filter((i) => i.category === c);

  // Auto-complete quando existe ≥1 item em cada categoria.
  const done =
    byCategory("certainty").length > 0 &&
    byCategory("assumption").length > 0 &&
    byCategory("doubt").length > 0;
  useEffect(() => { if (done) onAutoComplete(); }, [done, onAutoComplete]);

  const create = useMutation({
    mutationFn: () => createCsdItem({ data: { organizationId: currentOrgId!, category: active, text: text.trim() } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["csd", currentOrgId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCsdItem({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["csd", currentOrgId] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const suggest = useMutation({
    mutationFn: () => generateCsdSuggestions({ data: { organizationId: currentOrgId!, businessContext: businessContext.trim() } }),
    onSuccess: (res) => {
      toast.success(`${res.count} sugestões adicionadas`);
      qc.invalidateQueries({ queryKey: ["csd", currentOrgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="surface-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Adicionar item
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = active === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive ? `${c.chip} ring-2 ${c.ring}` : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {c.title}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Escreva uma ${CATEGORIES.find((c) => c.id === active)?.title.toLowerCase()}...`}
              rows={2}
              className="flex-1"
            />
            <Button onClick={() => create.mutate()} disabled={!text.trim() || create.isPending} className="self-end">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const rows = byCategory(c.id);
          return (
            <div key={c.id} className="surface-card relative overflow-hidden flex flex-col">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40"
                style={{ background: `radial-gradient(80% 100% at 50% 0%, ${c.glow}, transparent 70%)` }} />
              <div className="relative flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-full ${c.chip}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display font-semibold">{c.title}</h3>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{rows.length}</Badge>
              </div>
              <div className="relative flex-1 space-y-2 p-4 pt-2">
                {rows.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon className="mx-auto h-6 w-6 opacity-40 mb-2" />
                    <p className="text-xs">Nenhum item ainda</p>
                  </div>
                )}
                {rows.map((r) => (
                  <div key={r.id} className="group flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-sm transition hover:bg-white/[0.06]">
                    {r.source === "ai" ? <Sparkles className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 opacity-60" /> : <Icon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 opacity-60" />}
                    <p className="flex-1 leading-snug">{r.text}</p>
                    <button type="button" onClick={() => remove.mutate(r.id)} className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground" aria-label="Remover">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="surface-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Sugestões com IA
          </CardTitle>
          <CardDescription>
            Descreva seu negócio e a IA popula a matriz com um ponto de partida realista.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            rows={3}
            placeholder="Ex.: Somos uma agência B2B de marketing performance para varejo de moda..."
          />
          <Button onClick={() => suggest.mutate()} disabled={suggest.isPending || businessContext.trim().length < 10}>
            {suggest.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Gerar com IA</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
