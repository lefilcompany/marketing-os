## Diagnóstico

No preview, `localStorage["lekpis:cliente-id"]` está `null`. O hook `useLekpisConnect` tem esta guarda logo no início:

```ts
if (!clienteId) { toast.error("Nenhum cliente ativo selecionado."); return; }
```

Como o `ClienteAtivoProvider` chama `cliente.ensure_default` no boot mas engole qualquer erro (`.catch(() => {})`), quando o tool falha (ou retorna um shape diferente do esperado) o `clienteId` permanece `null` para sempre — e o clique no botão Conectar simplesmente mostra um toast e volta. Do ponto de vista do usuário, "não acontece nada".

Confirmado: MCP do LeKPIs está conectado (`mcp_connections.provider = 'lekpis'` presente), então o problema não é OAuth — é o cliente ativo.

## Correções

**1. `src/contexts/cliente-ativo-context.tsx`**
- Não engolir mais o erro do `cliente.ensure_default`: guardar em estado `ensureError` e expor no contexto.
- Expor `ensureDefault()` como método público para reexecutar sob demanda.
- Aceitar mais shapes de retorno: `{ id }`, `{ items: [...] }`, `{ cliente: {...} }`, ou array direto.
- Se `cliente.ensure_default` falhar, tentar fallback com `cliente.list` e usar `items[0].id`.

**2. `src/hooks/use-lekpis-connect.ts`**
- Se `clienteId` estiver ausente no momento do clique, chamar `ensureDefault()` antes de abortar.
- Abrir `window.open(...)` **antes** do `await` (com `about:blank` e depois `popup.location.href = url`) para não ser bloqueado pelo browser como popup não-iniciado por gesto.
- Se `integracao.get_connect_url` não retornar URL, mostrar toast com a mensagem real (não apenas "URL não retornada").
- Logar erros no `console.error` para diagnóstico futuro.

**3. `src/routes/_authenticated/lekpis.index.tsx` e `lekpis.integracoes.tsx`**
- Quando `clienteId` for `null` e houver `ensureError`, mostrar um banner acima dos cards com botão "Tentar novamente" (chama `ensureDefault()`) e um atalho para `/lekpis/perfil` (que já tem seletor/criador de cliente).
- Desabilitar visualmente o botão "Conectar" nesse estado (tooltip: "Selecione um cliente primeiro").

**4. `src/components/lekpis/canal-card.tsx` e `integracao-card.tsx`**
- Aceitar prop `disabled` e refletir no `<Button>`; passar `disabled={!clienteId}` das telas.

## Fora de escopo

- Não vou reimplementar OAuth, `callMcpTool` nem `mcp.server.ts`.
- Não vou alterar o shape das tools do MCP LeKPIs.

## Como validar

1. Após o fix, abrir `/lekpis` com `localStorage` limpo: se `ensure_default` falhar, aparece banner com erro real e botão de retry.
2. Se `ensure_default` funcionar, `clienteId` fica populado e o botão "Conectar" abre popup do OAuth.
3. Popup não é bloqueado (aberto no clique, URL setada depois).
