import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getModule } from "@/lib/modules";
import { useWorkspace } from "@/lib/workspace-context";
import {
  listPersonas,
  createPersona,
  deletePersona,
  generatePersonaBase,
  generateICP,
} from "@/lib/personas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Users,
  Plus,
  Sparkles,
  Trash2,
  ArrowUpRight,
  Loader2,
  Target,
  Database,
  TrendingUp,
  Brain,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { ModulePlatformShell } from "@/components/module-platform-shell";

const METHODOLOGY: Array<{
  step: string;
  title: string;
  description: string;
  icon: typeof Layers;
  to?: string;
  status: "active" | "soon";
}> = [
  {
    step: "01",
    title: "Alinhamento inicial",
    description: "Matriz CSD — Certezas, Suposições e Dúvidas sobre o público.",
    icon: Layers,
    to: "/deepersona/csd",
    status: "active",
  },
  {
    step: "02",
    title: "Coleta de dados",
    description: "Entrevistas, pesquisas e analytics vinculados ao CSD.",
    icon: Database,
    to: "/deepersona/coleta",
    status: "active",
  },
  {
    step: "03",
    title: "Segmentação",
    description: "Clusters gerados pela IA a partir do CSD + coleta.",
    icon: TrendingUp,
    to: "/deepersona/segmentacao",
    status: "active",
  },
  {
    step: "04",
    title: "Criação de personas",
    description: "Canvas detalhado com JTBD, motivações e objeções.",
    icon: Users,
    status: "active",
  },
  {
    step: "05",
    title: "Priorização",
    description: "Matriz de importância × urgência para definir foco.",
    icon: Target,
    to: "/deepersona/priorizacao",
    status: "active",
  },
  {
    step: "06",
    title: "Agentes IA",
    description: "Agentes inteligentes baseados nas personas.",
    icon: Brain,
    to: "/deepersona/agentes",
    status: "active",
  },
];

const STAGE_LABEL: Record<string, string> = {
  draft: "Rascunho",
  base: "Base",
  icp: "ICP",
  journey: "Jornada",
  insights: "Insights",
  live: "Viva",
};

const STAGE_ORDER = ["draft", "base", "icp", "journey", "insights", "live"];

export const Route = createFileRoute("/_authenticated/deepersona")({
  head: () => ({ meta: [{ title: "DeePersona — Marketing OS" }] }),
  component: DeePersonaIndex,
});

function DeePersonaIndex() {
  const mod = getModule("deepersona")!;
  const Icon = mod.icon;
  const { currentOrgId } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const list = useQuery({
    queryKey: ["personas", currentOrgId],
    queryFn: () => listPersonas({ data: { organizationId: currentOrgId! } }),
    enabled: !!currentOrgId,
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [briefing, setBriefing] = useState("");
  const [useAI, setUseAI] = useState(true);

  const create = useMutation({
    mutationFn: async () => {
      const res = await createPersona({
        data: {
          organizationId: currentOrgId!,
          name: name.trim(),
          role: role.trim() || undefined,
          description: briefing.trim() || undefined,
        },
      });
      const personaId = res.item.id;

      // Dispara geração de base + ICP em background e sinaliza para o Canvas
      // exibir a barra de progresso enquanto o editor recarrega sozinho.
      if (useAI && briefing.trim().length >= 4) {
        try {
          sessionStorage.setItem(`deepersona:generating:${personaId}`, "1");
        } catch { /* noop */ }
        generatePersonaBase({ data: { id: personaId, briefing: briefing.trim() } })
          .then(() => generateICP({ data: { id: personaId } }))
          .then(() => {
            try { sessionStorage.removeItem(`deepersona:generating:${personaId}`); } catch { /* noop */ }
            qc.invalidateQueries({ queryKey: ["persona", personaId] });
            qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
            toast.success(`Persona "${res.item.name}" pronta com base + ICP`);
          })
          .catch((e: Error) => {
            try { sessionStorage.removeItem(`deepersona:generating:${personaId}`); } catch { /* noop */ }
            toast.error(`Falha ao gerar com IA: ${e.message}`);
          });
      }
      return res.item;
    },
    onSuccess: (persona) => {
      toast.success("Persona criada");
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      qc.invalidateQueries({ queryKey: ["modules-overview", currentOrgId] });
      setOpen(false);
      setName("");
      setRole("");
      setBriefing("");
      navigate({ to: "/deepersona/$id", params: { id: persona.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePersona({ data: { id } }),
    onSuccess: () => {
      toast.success("Persona removida");
      qc.invalidateQueries({ queryKey: ["personas", currentOrgId] });
      qc.invalidateQueries({ queryKey: ["modules-overview", currentOrgId] });
    },
  });

  return <ModulePlatformShell module={mod} />;
}

