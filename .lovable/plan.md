# Wizard unificado em `/deepersona` (single-route)

Reescrever `/deepersona` como um **wizard de etapa única** com 6 estados. Nada de sub-rotas: tudo acontece na mesma rota, com transição de estado. As sub-rotas atuais (`csd`, `coleta`, `segmentacao`, `priorizacao`, `agentes`) deixam de ser navegadas — cada uma vira um **painel de etapa** renderizado condicionalmente dentro da própria página.

## Comportamento

- Stepper horizontal fixo no topo com 6 pills (Alinhamento → Coleta → Segmentação → Personas → Priorização → Agentes).
  - Pills passadas: check verde, clicáveis para revisitar.
  - Pill atual: destacada com a cor da etapa, linha de progresso animada preenchendo até ela.
  - Pills futuras: cadeado, disabled.
- Header persistente com o **ICP ativo** (mantém o bloco de seleção de persona que já existe hoje) — o ICP guia todas as etapas.
- Área central: uma etapa por vez, transição fade + slide horizontal ao avançar/voltar (CSS puro, sem dep nova).
- Rodapé fixo com **Voltar** / **Avançar** — Avançar só habilita quando a etapa atual está marcada como concluída.
- Ao concluir a etapa 6: tela "Fluxo concluído" com resumo (persona ativa, quantos segmentos, etc.), atalho para abrir chat, e botão "Recomeçar".

## Conteúdo de cada etapa (painéis inline)

Cada painel é um componente local dentro de `deepersona.index.tsx`, recebe `{ personaId, onComplete }`. Reaproveita **as queries e mutations já existentes** em `src/lib/*.functions.ts` (csd, segments, personas, priorities, agents) — nenhum backend novo.

1. **Alinhamento (CSD)** — matriz 3 colunas (Certezas / Suposições / Dúvidas). Input inline com "adicionar item" e chips removíveis. Botão "Gerar sugestões com IA" (usa `generateCsdSuggestions` existente). Concluído quando existe ≥1 item em cada coluna.
2. **Coleta de Dados** — drop zone para CSV/planilha + lista de fontes já adicionadas + campo para descrever fonte manual. Concluído com ≥1 fonte registrada.
3. **Segmentação** — trigger "Analisar clusters" (usa função existente), lista de segmentos detectados com badges de aderência ao ICP. Concluído com ≥1 segmento salvo.
4. **Criação de Personas** — canvas editável (nome, papel, dores, objetivos, gatilhos, comportamento). Botão "Gerar canvas com IA a partir dos segmentos". Concluído quando canvas tem campos-chave preenchidos.
5. **Priorização** — matriz 2×2 (Importância × Urgência) drag-and-drop simples (ou seletores por item) sobre os segmentos/personas. Concluído com todos os itens posicionados.
6. **Agentes IA** — lista das personas criadas como cards de chat, cada uma abre um painel de conversa inline (reusa `agents.functions.ts`). Concluído ao enviar primeira mensagem.

Cada painel mostra no topo uma faixa "Conexão com o ICP" resumindo como aquela etapa se apoia no ICP da persona ativa.

## Progressão sem erros

- Progresso em `localStorage`: `deepersona:flow:<personaId> = { currentStep, completed: number[] }`.
- Detecção automática de conclusão via as queries existentes (se já há CSD/segmentos/canvas/priorização, marca como completo ao carregar).
- Fallback: botão manual "Marcar etapa como concluída" em cada painel — garante que ninguém trava se a detecção automática falhar.
- Trocar de persona ativa no header recarrega o progresso daquela persona (chave por `personaId`).
- Sem `<Link>` para sub-rotas — apenas mudança de estado `currentStep`.

## Design

- Layout centrado (`max-w-4xl`), respiração generosa, `surface-card` com gradient sutil na cor da etapa.
- Stepper no estilo do `guided-flow-bar.tsx` já existente (mesma linguagem visual: pills, check, linha de progresso).
- Cada painel: ícone grande + eyebrow "Etapa 0X" + título display + descrição + faixa "Conexão com ICP" + conteúdo interativo.
- Tokens já existentes (`font-display`, `surface-card`, `oklch` tints por etapa definidos no arquivo atual).
- Transição entre etapas: fade opacity + translate-x 12px, `duration-300`.

## Arquivos afetados

- **`src/routes/_authenticated/deepersona.index.tsx`** — reescrito. Toda a lógica de wizard + os 6 painéis inline vivem aqui (com componentes locais no mesmo arquivo, ou pequenos componentes vizinhos em `src/components/deepersona/` se ficar grande).
- **Possível novo diretório `src/components/deepersona/`** contendo `step-csd.tsx`, `step-coleta.tsx`, `step-segmentacao.tsx`, `step-personas.tsx`, `step-priorizacao.tsx`, `step-agentes.tsx` — cada um exporta um componente puro que recebe `{ personaId, onComplete }`. Divisão apenas por legibilidade; nada de rotas novas.
- **Sub-rotas atuais `deepersona.csd.tsx`, `deepersona.coleta.tsx`, `deepersona.segmentacao.tsx`, `deepersona.priorizacao.tsx`, `deepersona.agentes.tsx`** — mantidas no repo por ora (não removo para não quebrar links externos/bookmarks), mas simplificadas para apenas redirecionar para `/deepersona` (`<Navigate to="/deepersona" replace />`). Assim garanto zero navegação para elas a partir do wizard e o usuário sempre volta ao fluxo unificado.
- **`deepersona.$id.tsx`** — mantida como está (canvas detalhado de uma persona individual, útil fora do fluxo).
- **Nenhum backend/schema alterado.** Reuso das server functions existentes.

## Fora do escopo

- Não crio novas tabelas nem migrações.
- Não altero `guided-flow-bar` global.
- Não removo os arquivos de sub-rota (só neutralizo com redirect) — remoção pode ser feita depois com segurança.
