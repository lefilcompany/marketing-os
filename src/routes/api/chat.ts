import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai-gateway.server";
import { listConnectedProviders, loadMcpToolsForUser } from "@/lib/mcp-tools.server";

const MODEL_ID = "google/gemini-3.5-flash";

const SYSTEM_PROMPT = `Você é o Agente Orquestrador do Marketing OS, definido no CONTEXT.md §5.

Responsabilidades:
- Recebe a intenção do usuário, planeja e decide quais tools MCP das aplicações especializadas (DeePersona, Creator, Soma, LeKPIs, MonitorNews) acionar.
- Segue o método AEIOU: Ambiente, Estratégia, Interações, Operações, Unificação — com estágios Design/Desenvolver/Entregar.
- **Nunca age sozinho em decisões relevantes**: para tarefas ambíguas ou que envolvam criação/mudança de dados, faça perguntas curtas antes de executar.
- **Confirmação para tools destrutivas**: nunca execute tools marcadas como destrutivas sem confirmação explícita do usuário.
- **Evidência**: toda afirmação sobre dados do usuário deve citar a tool que produziu a informação (nome + provedor). Diferencie fato observado, correlação e inferência.
- Responda em português do Brasil, com clareza e objetividade. Use markdown para estruturar.
- Quando o usuário pedir algo que dependa de uma ferramenta ainda não conectada, oriente-o a conectar o app correspondente na página /dashboard.

Estilo: assistente executivo, direto, sem enrolação. Sem emojis salvo se o usuário usar primeiro.`;

async function authenticateRequest(request: Request): Promise<{ userId: string; supabase: ReturnType<typeof createClient<Database>> } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token || token.split(".").length !== 3) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}`, apikey: key },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if ((key.startsWith("sb_") || key.startsWith("sb_publishable_")) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { userId: data.claims.sub as string, supabase };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as { messages?: UIMessage[] };
        const messages = body.messages;
        if (!Array.isArray(messages)) {
          return new Response("Missing messages", { status: 400 });
        }

        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(lovableKey, initialRunId);
        const model = gateway(MODEL_ID);

        const [tools, connected] = await Promise.all([
          loadMcpToolsForUser(auth.supabase, auth.userId),
          listConnectedProviders(auth.supabase, auth.userId),
        ]);

        const connectedList = connected.length
          ? `Aplicações MCP conectadas neste momento: ${connected.map((c) => c.name).join(", ")}.`
          : "Nenhuma aplicação MCP está conectada ainda. Oriente o usuário a conectar em /dashboard antes de tentar usar tools.";

        try {
          const result = streamText({
            model,
            system: `${SYSTEM_PROMPT}\n\n${connectedList}`,
            messages: convertToModelMessages(messages),
            tools,
            stopWhen: stepCountIs(50),
          });

          const response = result.toUIMessageStreamResponse({
            originalMessages: messages,
            headers: getLovableAiGatewayResponseHeaders(undefined, {
              ...(initialRunId ? { "X-Lovable-AIG-Run-ID": initialRunId } : {}),
            }),
          });
          return withLovableAiGatewayRunIdHeader(response, gateway);
        } catch (err) {
          const message = (err as Error).message ?? "Erro desconhecido";
          console.error("[api/chat] streamText failed:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
