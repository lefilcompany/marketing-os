# Plano — Marketing OS v1 (MVP até 19/jul)

Reposicionar a home e a navegação como o "sistema operacional de marketing" descrito no PRD, com **7 módulos** reais (DeePersona, Estratégia, Creator, Soma, Comunidades, LeKPIs, IA), estrutura real no banco e IA copiloto ativa via Lovable AI.

Vou executar em **4 fases**. Cada fase entrega valor sozinha e pode ser revisada antes da próxima.

---

## Fase 1 — Fundação (esta iteração)

Objetivo: transformar a home atual (que mostra "aplicações") em uma home Marketing OS com os 7 módulos, e criar o esqueleto navegável de todos eles.

**Home nova (`/dashboard`)**
- Cabeçalho compacto à esquerda: "Marketing OS · LeFil" + saudação + Marketing Score (mock por enquanto).
- Grid dos **7 módulos** como cards de vidro grandes (mantém o efeito atual: glass, reflexo, glow por cor de módulo).
- Cada card: ícone, nome, subtítulo curto ("Conheça seus clientes", "Transforme conhecimento em plano", etc.), status ("Ativo"/"Em breve") e um KPI vivo do módulo (ex.: nº de personas, nº de campanhas).
- Bloco lateral pequeno "IA Copiloto" com 2–3 recomendações geradas pela IA (real, via gateway).
- Sem scroll na home; abaixo dos cards, timeline compacta das últimas atividades.

**Sidebar**
- Reorganizada para: Home · DeePersona · Estratégia · Creator · Soma · Comunidades · LeKPIs · Biblioteca · IA · Configurações. Mantém grupos de Gestão e Administração já existentes.

**Rotas (shells navegáveis)**
- `/deepersona`, `/estrategia`, `/creator`, `/soma`, `/comunidades`, `/lekpis`, `/biblioteca`, `/ia`.
- Cada shell: header do módulo, tabs vazias com placeholders "Em construção" claros — nada de botão fake.
- `/aplicacoes` continua existindo (agora é a integração com plataformas externas da LeFil, não o produto principal).

**IA copiloto (mínimo funcional já nesta fase)**
- Server function `generateCopilotRecommendations` usando `google/gemini-3-flash-preview` via Lovable AI Gateway.
- Recebe contexto do workspace (nome da org, contagens de personas/estratégias/etc.) e devolve 3 recomendações estruturadas (`{ title, body, module, severity }`) usando `Output.object`.
- Home consome via TanStack Query.

**DB — migrações fase 1**
- `personas` (workspace, nome, descrição, dados demográficos jsonb, dores jsonb, ganhos jsonb, canais jsonb, status).
- `strategies` (workspace, nome, objetivo, posicionamento, proposta_valor, canais jsonb, frameworks jsonb, status, persona_id).
- `campaigns` (workspace, nome, estratégia_id, objetivo, canal, status, kpis jsonb).
- `projects` (workspace, campanha_id, nome, status, prazo).
- `tasks` (project_id, título, status, responsável, prazo).
- `communities` (workspace, nome, tipo, plataforma, membros_estimados).
- `kpi_snapshots` (workspace, chave, valor, meta, período).
- `copilot_recommendations` (workspace, título, corpo, módulo, severidade, dismissed).
- `library_items` (workspace, tipo, nome, payload jsonb) — para a Biblioteca única.

Todas com RLS scoped por `organization_members` + GRANTs corretos.

---

## Fase 2 — DeePersona e Estratégia completos

- CRUD de Personas com wizard guiado (etapas do PRD).
- CRUD de Estratégias com frameworks AEIOU/CRISC/PARTE em formulários guiados.
- Templates iniciais e biblioteca sendo populada.
- IA: gerar rascunho de persona a partir de descrição livre; gerar estratégia a partir de persona.

## Fase 3 — Creator e Soma

- Creator: gerar conteúdo (post, email, roteiro, landing copy) puxando persona + estratégia como contexto de prompt.
- Soma: transformar campanha em tarefas automaticamente (server fn que cria `project` + `tasks` a partir de um `campaign_id`), kanban simples.

## Fase 4 — Comunidades, LeKPIs, IA plena

- Comunidades: CRUD + jornadas e eventos (sem integração WhatsApp real).
- LeKPIs: dashboards com dados agregados dos módulos + insights da IA sobre os snapshots.
- IA: chat contextual persistente (histórico salvo por workspace).

---

## Decisões técnicas

- **Stack**: mantém TanStack Start + Supabase + shadcn. Todas as leituras via `createServerFn` com `requireSupabaseAuth`; RLS por membership.
- **IA**: Lovable AI Gateway, provider `createLovableAiGatewayProvider` em `src/lib/ai-gateway.server.ts`. Model default `google/gemini-3-flash-preview`. Erros 402/429 exibidos como toast claro.
- **Ícones/cores dos módulos**: paleta já parcialmente presente (`--brand-creator`, `--brand-deepersona`, `--brand-lekpi`); vou estender com tokens para os 4 restantes em `styles.css`.
- **Nada mock invisível**: onde um número for simulado (ex.: Marketing Score fase 1), exibirei rótulo "demo" e nunca disfarçarei botão sem função.

---

## O que vou entregar **nesta rodada** (Fase 1)

1. Migração criando as 9 tabelas + RLS + GRANTs.
2. Server functions: `getModuleOverview`, `listPersonas/Strategies/... (contagens)`, `generateCopilotRecommendations`, `dismissRecommendation`.
3. Provider Lovable AI em `src/lib/ai-gateway.server.ts`.
4. Home nova com 7 cards + painel IA + timeline.
5. Sidebar atualizada.
6. Shells de rota para os 7 módulos + Biblioteca + IA.
7. Tokens de cor de módulo em `styles.css`.

Se aprovar, sigo. Depois combinamos por qual módulo aprofundar na Fase 2.