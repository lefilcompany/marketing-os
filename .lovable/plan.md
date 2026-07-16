## Objetivo

Remover completamente a integração MCP do Soma para começar do zero.

## Mudanças

1. **`src/lib/mcp.server.ts`** — Remover o bloco `soma` de `MCP_PROVIDERS`.

2. **`src/lib/aeiou-modules.ts`** — No card do Soma (módulo O): remover `mcpProvider: "soma"` e mudar `status` de `"ready"` para `"coming_soon"`.

3. **Não mexer** em conexões existentes na tabela `mcp_connections` (caso o usuário queira preservar histórico). Se quiser limpar também, avisar.

## Verificação

- Configurações → MCP: tile "Soma" não aparece mais como provider.
- Módulo O: card do Soma segue visível, mas sem botão de conectar MCP (status coming_soon).
