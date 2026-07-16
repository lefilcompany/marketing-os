
## Objetivo

Transformar o Marketing OS Shell no **agente orquestrador** definido em `CONTEXT.md §5`: um chat único que usa **`google/gemini-3.5-flash`** (via Lovable AI Gateway) para entender a intenção do usuário, decidir quais **tools MCP** de quais aplicações especializadas acionar (DeePersona, Creator, Soma, LeKPIs, MonitorNews) e consolidar a resposta com evidência.

## O que é MCP e por que usar

**MCP (Model Context Protocol)** é um protocolo padrão que expõe capacidades de um app externo como **tools** tipadas (`name`, `description`, `inputSchema`) e **resources** para um LLM. Vantagens versus REST direto:

- O LLM recebe o catálogo dinâmico via `tools/list` — sem colar OpenAPI no prompt.
- Cada tool tem semântica de leitura/escrita/destrutiva → o Shell aplica confirmação (RN §4).
- Autenticação padronizada (aqui: OAuth2 PKCE + DCR contra o Supabase Auth de cada app).
- Adicionar um app novo = adicionar 1 provider config; zero mudança no cliente.

Fluxo em runtime:

```text
Usuário → Chat (Shell) → streamText(gemini-3.5-flash) ⇄ tools MCP
                                    │
                                    ├─ tools/list dos MCPs conectados (cache /request)
                                    ├─ modelo escolhe tool(s) + args
                                    ├─ tools/call via HTTP Streamable (já pronto)
                                    └─ consolida saída + evidência
```

## Modelo e chave

Usar **`google/gemini-3.5-flash`** através do **Lovable AI Gateway** (`LOVABLE_API_KEY`, já provisionado). Motivos:

- É o id suportado no catálogo do gateway (o "gemini 3.5" que o usuário pediu bate exatamente aqui).
- Elimina uma chave a gerenciar; o gateway já cuida de billing, rate-limit e retry.
- A chave própria do Gemini que o usuário mencionou fica reservada para caso o gateway indisponibilize o modelo — não é usada no caminho padrão.

Se, ainda assim, quiser plugar a chave própria do Gemini como fallback, entra numa fatia posterior (provider `@ai-sdk/google` direto), sem alterar a API interna.

## Estado atual (já pronto)

- Providers MCP para `deepersona`, `creator`, `soma`, `lekpis` em `src/lib/mcp.server.ts` (OAuth PKCE + DCR + refresh + `tools/list` + `tools/call`).
- Server fns `startMcpAuth`, `listMcpTools`, `callMcpTool`, `disconnectMcp` em `src/lib/mcp.functions.ts`.
- Tabelas `mcp_connections` e `mcp_oauth_states` com RLS por `user_id`.
- Callback OAuth em `src/routes/api/mcp/callback.ts`.

Falta: (1) MonitorNews como 5º provider, (2) camada de tools MCP → AI SDK, (3) rota de chat streaming, (4) UI de chat.

## Plano

### 1. MonitorNews como 5º provider MCP

Adicionar entry `monitornews` em `MCP_PROVIDERS` (`src/lib/mcp.server.ts`) com `authorizationServer`, `resource`, `tokenEndpoint`, `registrationEndpoint`, `apiKeyFallback` (anon key do projeto MonitorNews). Marcar `status: "ready"` + `mcpProvider: "monitornews"` em `aeiou-modules.ts`. Zero mudança de código no cliente MCP.

Pré-req: confirmar que MonitorNews expõe `/functions/v1/mcp` no mesmo padrão dos outros 4. Se não expuser, entrego os 4 e MonitorNews vem numa 2ª iteração.

### 2. Ponte MCP → AI SDK tools

Novo `src/lib/mcp-tools.server.ts` com `loadMcpToolsForUser(userId)`:

1. Lê `mcp_connections` do usuário sob RLS.
2. Para cada conexão viva: chama `mcpInitializeAndListTools(resource, accessToken)` (já existente) — resultado em cache por request.
3. Converte cada `McpToolDescriptor` num `tool()` do AI SDK, namespaced (`deepersona__get_persona`, `creator__create_brief`, …) para evitar colisão.
4. `inputSchema` do MCP (JSON Schema) → Zod via `json-schema-to-zod` runtime (fatia mínima; sem `.min/.max/format` para não travar o modelo — regra do `ai-sdk-lovable-gateway`).
5. `execute()` do tool chama `mcpCallTool(...)`; erros MCP viram texto de erro do tool (não crash).
6. Tools com `annotations.destructiveHint: true` recebem `needsApproval: true` (loop-control do AI SDK) — o modelo pede confirmação antes; o cliente mostra botão "Confirmar" e reenvia.

### 3. Rota de chat streaming

Novo `src/routes/api/chat.ts` (server route TanStack — precisa `Response` streaming; não `createServerFn`):

- Autentica manualmente via bearer Supabase (`context.supabase.auth.getUser` na `client.server` ou verificação do JWT); rejeita 401.
- Recebe `{ messages }` do `useChat` (AI SDK UI).
- Constrói provider via `createLovableAiGatewayProvider(process.env.LOVABLE_API_KEY!, initialRunId)` (helper do `ai-sdk-lovable-gateway`).
- `model = gateway("google/gemini-3.5-flash")`.
- Carrega tools MCP do usuário (passo 2).
- `streamText({ model, system, messages: convertToModelMessages(messages), tools, stopWhen: stepCountIs(50) })`.
- System prompt fiel ao `CONTEXT.md`: papel de orquestrador AEIOU, "sempre perguntar antes de decidir", regra de evidência, regra de confirmação para tools destrutivas, referência aos pilares/estágios.
- Retorna `result.toUIMessageStreamResponse({ originalMessages: messages })` embrulhado em `withLovableAiGatewayRunIdHeader(response, gateway)` para telemetria.

Tratamento de erro: 429 → toast "muitas requisições, tente em instantes"; 402 → toast "créditos Lovable AI esgotados, adicione no workspace"; demais → mensagem genérica com o `message` do erro.

### 4. UI do orquestrador

Nova rota `/_authenticated/orquestrador.tsx` + item no menu lateral (`app-shell.tsx`):

- `useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) })`.
- Renderiza `message.parts` (texto com `react-markdown`, tool-call, tool-result colapsável com botão "Ver evidência").
- Banner topo listando MCPs conectados/faltantes (link para `/dashboard` ou `/modulo/$letra` para conectar).
- Estado `submitted`/`streaming` desabilita o input; auto-scroll ao final.
- Sem persistência de thread nesta fatia (só memória local do `useChat`).

### 5. Guardrails

- Sem `service_role` no caminho do chat — leituras de `mcp_connections` via server fn autenticada; tokens OAuth ficam no servidor.
- `LOVABLE_API_KEY` só em `process.env` dentro do handler.
- Tools MCP com `destructiveHint` sempre passam por `needsApproval`.
- Log por request: `user_id`, ids das tools invocadas, latência, `X-Lovable-AIG-Run-ID`. Sem body de tools.

## Arquivos

**Novos**
- `src/lib/mcp-tools.server.ts`
- `src/routes/api/chat.ts`
- `src/routes/_authenticated/orquestrador.tsx`

**Editados**
- `src/lib/mcp.server.ts` — provider `monitornews`
- `src/lib/aeiou-modules.ts` — MonitorNews `status: "ready"` + `mcpProvider: "monitornews"`
- `src/components/app-shell.tsx` — item de menu "Orquestrador"
- `src/lib/ai-gateway.server.ts` — trocar helper mínimo atual pelo helper canônico do `ai-sdk-lovable-gateway` (com `runIdFetch` e `withLovableAiGatewayRunIdHeader`)

**Dependências novas**
- `@ai-sdk/react`, `ai` (se ainda não presentes), `json-schema-to-zod`, `react-markdown`

## Fora de escopo desta fatia

- Sub-agentes paralelos (§5): a próxima fatia; começamos com um loop único Gemini + tools.
- Persistência de conversas no Cloud: próxima fatia.
- OAuth2 modo `oauth2` para servidores MCP de terceiros: PRD marca como planejado.
- Fallback para chave própria do Gemini via `@ai-sdk/google`.

## Perguntas antes de implementar

1. **MonitorNews** já expõe `/functions/v1/mcp` no mesmo padrão dos outros 4 apps? Se ainda não, entrego a fatia com os 4 e MonitorNews numa 2ª iteração — sem bloquear.
2. Confirmo o caminho pelo **Lovable AI Gateway** (`google/gemini-3.5-flash`, sem sua chave própria por enquanto)? A chave própria fica documentada para um fallback opcional numa próxima fatia.
