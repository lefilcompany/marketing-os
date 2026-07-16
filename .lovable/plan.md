## Objetivo

Fazer o `listClients` reconhecer o envelope `{ success, data: { clients: [...] } }` que o `marketing_os_list_clients` realmente retorna.

## Diagnóstico (confirmado pelo log)

Payload cru:
```
{ "success": true, "data": { "clients": [ {id, name, avatarUrl, createdAt, integrations}, ... ] } }
```

O `ListWrap` atual tenta `array`, `{items}`, `{data:array}`, `{results}`, `{clients}`, etc. — todos no primeiro nível. O envelope real é aninhado (`data.clients`), então nenhuma variante casa e o `z.union` estoura `invalid_union`.

Cada cliente individual já casa com o `ClientSchema` tolerante (tem `id` e `name`).

## Alteração

`src/lib/mcp-client/providers/lekpis.server.ts` — trocar `ListWrap` por um pré-processador que desembrulha camadas comuns antes de validar o array:

```ts
const ListWrap = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((raw) => {
    // 1. Desce em envelopes comuns: {success,data}, {data}, {result}
    let cur: unknown = raw;
    for (let i = 0; i < 3; i++) {
      if (Array.isArray(cur)) return cur;
      if (cur && typeof cur === "object") {
        const o = cur as Record<string, unknown>;
        // se algum campo top-level já é array, usa esse
        for (const key of ["clients", "clientes", "campaigns", "campanhas", "items", "results", "list"]) {
          if (Array.isArray(o[key])) return o[key];
        }
        // caso contrário, desce em {data} ou {result}
        if (o.data !== undefined) { cur = o.data; continue; }
        if (o.result !== undefined) { cur = o.result; continue; }
      }
      break;
    }
    return cur;
  }, z.array(item));
```

Essa forma:
- Aceita `[...]` direto.
- Aceita `{items|results|clients|clientes|campaigns|campanhas|list: [...]}` em qualquer nível até 3 de profundidade.
- Desce em `data` / `result` recursivamente (cobre `{success,data:{clients:[...]}}` que é o caso atual).
- Mantém compatibilidade com todas as variantes que já funcionavam.

## Verificação

1. Recarregar `/analise-campanhas` → dropdown de clientes deve mostrar "Creator", "Lefil Company", "Comunidade RDF", etc.
2. Se ainda falhar, o warning `[mcp:lekpis] validation failed` no worker mostra novo shape.

## Fora de escopo

Refatoração das outras tools (`get_kpi_summary`, `compare_periods`, `get_timeseries`, `get_campaign_ranking`, `get_alerts`) — próximo turno, depois que a listagem estiver estável.