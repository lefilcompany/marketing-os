
## Diagnóstico

Chamei o MCP do LeKPIs diretamente com o token OAuth salvo do usuário e confirmei:

- A conexão está gravada corretamente em `mcp_connections` (provider `lekpis`, resource ok).
- `tools/list` expõe todas as tools esperadas (`cliente.list`, `cliente.ensure_default`, `cliente.get`, `integracao.list`, `profile.get`, `instagram.get_kpis`, etc.).
- `cliente.list` retorna **28 clientes** reais (Intrador, PetTop, Lefil Company, Comunidade RDF, Lumi, Paiva, Morada da Paz, Branding, Juq, etc.).

Mesmo assim a UI mostra "Nenhum cliente cadastrado ainda." e nenhum canal / KPI aparece. O motivo é o formato da resposta.

O servidor MCP do LeKPIs anuncia (no `initialize`):

> "Every tool follows the resource.action naming convention and returns `{ success, data|error, requestId, timestamp }`."

Ou seja, a payload real de `cliente.list` é:

```json
{ "success": true, "data": { "items": [...], "nextCursor": "..." }, "requestId": "...", "timestamp": "..." }
```

Nosso `unwrap` em `src/lib/lekpis-client.ts` faz `JSON.parse(content[0].text)` e retorna o objeto inteiro. O código consumidor (`useClienteList`, `useIntegracoes`, `useProfile`, `cliente.ensure_default`, todos os KPIs) espera `{ items: [...] }` / o próprio recurso no topo — então lê `undefined` e trata como lista vazia. Nada aparece.

## Correção

Ajustar apenas `callLekpis` em `src/lib/lekpis-client.ts` para desembrulhar o envelope antes de devolver — sem tocar nas queries.

Depois de parsear o JSON do MCP:

1. Se o objeto tem `success: false`, lançar `new Error(payload.error?.message ?? payload.error ?? "Erro LeKPIs")` (o toast atual em `use-lekpis-connect` já cuida).
2. Se o objeto tem `success: true` e possui `data`, retornar `payload.data`.
3. Caso contrário, retornar o objeto como está (compatibilidade defensiva).

Isso corrige de uma vez:
- `ClienteAtivoProvider.ensureDefault()` → `extractId` volta a encontrar `items[0].id` e grava `lekpis:cliente-id`.
- `useClienteList` → dropdown de clientes populado.
- `useIntegracoes`, `useProfile`, `instagram.get_kpis`, `facebook.get_kpis`, `meta_ads.list_campaigns` → todos passam a ver os campos reais.
- `useDisconnectIntegracao`, `useCreateCliente`, `useUpdateProfile` (mutations) → também retornam `data` corretamente.

## Verificação

1. Recarregar `/lekpis` — o dropdown "Meus clientes" em `/lekpis/perfil` deve listar os clientes ativos (Intrador, PetTop, Lefil Company, Lumi, Paiva, etc.).
2. Home `/lekpis` deve deixar de mostrar o banner "Crie seu primeiro cliente" e ativar os cards de canal.
3. Confirmar via replay/screenshot que os dados aparecem.

## Detalhe técnico

Arquivo alterado: `src/lib/lekpis-client.ts` (apenas função `unwrap`, ~10 linhas). Sem migrações, sem alterações de UI, sem tocar em `mcp.functions.ts` ou `mcp.server.ts` — o "envelope" é uma convenção específica do servidor LeKPIs, então a normalização pertence ao wrapper `callLekpis`.
