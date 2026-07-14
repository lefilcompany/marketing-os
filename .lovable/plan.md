# Remover integração LeKPIs MCP

Você vai reformular o MCP do LeKPIs do zero, então o app precisa voltar a um estado sem essa integração — sem rotas, sem hooks, sem contexto de cliente ativo e sem entradas na navegação apontando pra LeKPIs.

## O que vai ser removido

**Rotas (`src/routes/_authenticated/`)**
- `lekpis.tsx` (layout + gate de conexão)
- `lekpis.index.tsx`
- `lekpis.integracoes.tsx`
- `lekpis.perfil.tsx`
- `lekpis.canal.$slug.tsx`

**Hooks e contexto**
- `src/hooks/use-lekpis-queries.ts`
- `src/hooks/use-lekpis-connect.ts`
- `src/contexts/cliente-ativo-context.tsx`
- `src/lib/lekpis-client.ts`

**Componentes**
- `src/components/lekpis/` inteiro (top-bar, canal-card, integracao-card, cliente-selector)

**Dados persistidos no navegador**
- A chave `CLIENTE_STORAGE_KEY` (cliente ativo salvo) deixa de ser lida quando o contexto some. Não faço limpeza automática — é lixo inofensivo no `localStorage` do usuário.

**Banco / conexões OAuth MCP**
- Não removo linhas de `mcp_connections` nem `mcp_oauth_states`. A infra genérica de MCP (`src/lib/mcp.functions.ts`, `mcp.server.ts`, rota `api/mcp/callback`) continua no projeto porque é usada por outros conectores e pelo painel MCP. Só o provider `lekpis` deixa de ter UI que o acione. Quando o novo MCP for ligado, se quiser zerar a linha antiga do provider `lekpis`, faço isso num passo separado.

**Navegação / menus**
- Verifico `src/components/app-shell.tsx`, `command-palette.tsx`, `module-shell.tsx`, `modules.ts` e `flows.ts` e removo qualquer link/entrada apontando pra `/lekpis*`. Se o "módulo LeKPIs" estiver listado em `src/lib/modules.ts`, tiro dessa lista também.

## O que fica intacto

- Toda a infra genérica de MCP (OAuth start/callback, `getMcpConnection`, `listMcpTools`, `callMcpTool`, `disconnectMcp`, tabelas `mcp_connections` / `mcp_oauth_states`).
- Painel `mcp-oauth-panel` / `mcp-status-card` / `mcp-resource-explorer` — servem outros providers.
- Nenhuma migração de banco.

## Verificação depois de aplicar

1. `rg -l lekpis src/` deve voltar vazio (fora de comentários irrelevantes, se houver).
2. Build passa sem erro de import.
3. Home e demais rotas continuam abrindo normalmente; `/lekpis` passa a dar 404 (comportamento esperado).

Quando o novo MCP estiver pronto, a gente reintroduz as rotas/hook com base no novo schema de tools.
