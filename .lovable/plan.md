## Problema

Ao clicar em "Conectar Instagram", chamamos a tool MCP `integracao.get_connect_url` com:

```
{ platform: "instagram", cliente_id: "..." }
```

O servidor do LeKPIs valida com Zod e responde `-32602 Input validation error`:
- `path: ["plataforma"]` → esperado `plataforma` (não `platform`), enum `instagram | facebook | meta_ads | google_ads | linkedin | youtube | discourse`.
- `path: ["return_to"]` → esperado `string`, recebemos `undefined`.

Ou seja, não tem nada a ver com "não achou os clientes" — é só o contrato do argumento da tool que mudou/está diferente do que estamos enviando. Por isso a Home também parece "sem dados": todo botão de Conectar cai nesse 400 antes de abrir o popup.

## Correção

Arquivo único: `src/hooks/use-lekpis-connect.ts`

1. Renomear a chave enviada de `platform` → `plataforma` na chamada `callLekpis("integracao.get_connect_url", …)`.
2. Adicionar `return_to` como string. Usar a URL absoluta da própria home do módulo para o LeKPIs redirecionar de volta após o OAuth:
   - `return_to: `${window.location.origin}/lekpis/integracoes``
3. Manter `cliente_id` como já está.

Nada muda no fluxo visual, no callback (`/api/mcp/callback` continua tratando `postMessage` normal), nem em outras telas. `IntegracaoCard`/`useLekpisConnect` continuam sendo chamados com `platform: LekpisPlatform` internamente; a conversão para `plataforma` acontece só no momento da chamada MCP.

## Verificação

- Build passa (nenhuma outra referência a `platform:` no payload dessa tool).
- Clicar em "Conectar Instagram" na Home abre o popup do LeKPIs em vez de exibir o toast de erro.
- Console não mostra mais `MCP error -32602 Input validation error`.
