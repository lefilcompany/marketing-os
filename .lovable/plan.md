# Remover MCP do Soma e remover card RD Marketing

## Objetivo
- Retirar completamente a integração MCP do módulo **Soma** (começar do zero).
- **Remover** o card do **RD Marketing** do módulo O.

## Alterações

### 1. `src/lib/mcp.server.ts`
Remover o bloco `soma: { ... }` do objeto `MCP_PROVIDERS` (linhas 36–50), incluindo `apiKeyEnv` e fallback.

### 2. `src/lib/aeiou-modules.ts`
- **Soma**: remover `mcpProvider: "soma"` e trocar `status` para `"coming_soon"`.
- **RD Marketing**: remover o objeto inteiro `{ id: "rd-marketing", ... }` da lista de tools do módulo O.

### 3. Limpar conexões existentes no banco
Migration com `DELETE FROM mcp_connections WHERE provider = 'soma'` e `DELETE FROM mcp_oauth_states WHERE provider = 'soma'`.

## Verificação
- Módulo O mostra apenas: Soma (em breve) e LeKPIs (MCP ativo). Sem RD Marketing.
- Configurações → MCP: Soma não aparece mais.

## Observação
Secret `SOMA_SUPABASE_ANON_KEY` fica ocioso — confirme se quer deletá-lo depois.
