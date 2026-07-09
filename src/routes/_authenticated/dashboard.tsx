import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSessionBootstrap } from "@/lib/workspace.functions";
import {
  listCopilotRecommendations,
  generateCopilotRecommendations,
  dismissRecommendation,
} from "@/lib/modules.functions";
import { useWorkspace } from "@/lib/workspace-context";
import { MODULES, getModule } from "@/lib/modules";
import { FLOWS, type FlowDef, type FlowStepDef } from "@/lib/flows";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
  Lightbulb,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Marketing OS" }] }),
  component: Dashboard;
});
