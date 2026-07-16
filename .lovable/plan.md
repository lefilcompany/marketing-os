## Objetivo

Corrigir `MCP_VALIDATION_ERROR: Resposta de marketing_os_list_clients fora do schema esperado` sem depender de adivinhar o shape exato — e capturar o payload real para ajustes futuros.

## Diagnóstico

- `resolveTools()` já casa `marketing_os_list_clients` (fix anterior).
- A chamada chega ao servidor, mas `ClientSchema` (`{ id: string|number → string, name: string }`) via `ListWrap` (`array | {items} | {data} | {results}`) rejeita a resposta.
- Pela descrição da tool no `tools/list`, o payload agora carrega metadados de integração (Meta Ads, Instagram, Facebook, LinkedIn, Google Ads, Discourse) por cliente, e provavelmente usa nomes em pt-BR (`cliente_id`, `nome`) ou um envelope diferente (`clients`, `clientes`).

## Alterações

### 1. `src/lib/mcp-client/providers/lekpis.server.ts` — schema tolerante para clientes

Trocar o `ClientSchema` estrito por uma normalização que aceite variantes comuns e preserve metadados úteis:

```ts
const ClientRawSchema = z
  .object({
    // aceita id / cliente_id / clientId
    id: z.union([z.string(), z.number()]).optional(),
    cliente_id: z.union([z.string(), z.number()]).optional(),
    clientId: z.union([z.string(), z.number()]).optional(),
    // aceita name / nome / cliente_nome
    name: z.string().optional(),
    nome: z.string().optional(),
    cliente_nome: z.string().optional(),
    // integrações — passa adiante como flag booleana ou objeto
    integrations: z.unknown().optional(),
  })
  .passthrough()
  .transform((c) => {
    const id = c.id ?? c.cliente_id ?? c.clientId;
    const name = c.name ?? c.nome ?? c.cliente_nome;
    if (id == null || !name) return null;
    return {
      id: String(id),
      name: String(name),
      integrations: c.integrations,
    };
  })
  .refine((v): v is NonNullable<typeof v> => v !== null, {
    message: "Cliente sem id/nome",
  });
```

Ampliar `ListWrap` para incluir mais envelopes: `clients`, `clientes`, `content` (formato MCP tool-result quando `structuredContent` está ausente).

Atualizar `LeKpisClient` para incluir `integrations?: unknown`.

### 2. Log defensivo do payload cru quando validação falha

Em `transport.server.ts` → `callMcpTool`, quando `outputSchema.safeParse` falhar, logar (server-side) uma amostra truncada do payload cru para acelerar diagnóstico futuro:

```ts
console.warn(
  `[mcp:${opts.provider}] validation failed for ${opts.tool}`,
  { sample: JSON.stringify(parsed).slice(0, 800), issues: check.error.issues },
);
```

Sem vazar dados na resposta HTTP; apenas no log do worker (visível via dev-server logs).

### 3. Passar `integrations` para a UI (opcional, escopo mínimo)

Sem mudança agora — o campo é preservado no tipo mas a página `analise-campanhas` continua exibindo só `name`. Um follow-up pode mostrar badges de integrações ativas.

## O que NÃO está no escopo

- Refatorar `Listar campanhas` e `Gerar análise` para as novas tools (`marketing_os_get_kpi_summary`, `compare_periods`, `get_timeseries`, `get_campaign_ranking`, `get_alerts`). Fica para o próximo turno depois que a listagem estiver estável.

## Verificação

1. Recarregar `/analise-campanhas`.
2. Se validação passar → dropdown de clientes preenchido.
3. Se ainda falhar → checar log do worker (`sqlite3 /tmp/sandbox-state.db …` ou `/tmp/dev-server-logs/dev-server.log`) pelo warning `[mcp:lekpis] validation failed for marketing_os_list_clients` com a amostra crua, e ajustar o schema com base no shape real.