# Reformular fluxo LeKPIs: Conectar → Escolher cliente → Home

## Problema atual
- `/lekpis` (home) trava porque `ClienteAtivoProvider` chama automaticamente `cliente.ensure_default` no boot, e enquanto isso a Home renderiza estados intermediários com queries que podem ficar suspensas ou disparar antes do cliente existir.
- Não há uma etapa explícita para o usuário escolher qual cliente monitorar; hoje ele "cai" num cliente default, o que confunde e trava quando `ensure_default` demora ou falha.

## Novo fluxo (3 gates no layout `/lekpis`)

```text
[Conta LeKPIs conectada?] -- não --> Tela "Conectar LeKPIs" (já existe)
        | sim
        v
[Cliente ativo selecionado?] -- não --> Tela "Escolher cliente"
        | sim                             (lista clientes, botão selecionar,
        v                                  botão criar novo em Perfil)
Home + TopBar + rotas filhas
```

Cada gate é resolvido no layout `src/routes/_authenticated/lekpis.tsx` antes de montar `ClienteAtivoProvider` + `<Outlet />`. Assim, a Home nunca renderiza sem cliente ativo — elimina o travamento.

## Mudanças

### 1. `src/routes/_authenticated/lekpis.tsx` (layout)
- Manter gate 1 (conexão MCP) como está.
- Após conectado, montar um novo componente `SelecionarClienteGate` que:
  - Usa `useQuery(clienteListOptions())` para listar clientes.
  - Lê `clienteId` do `localStorage` (chave `lekpis:cliente-id`).
  - Se `clienteId` já existe e está na lista → renderiza `ClienteAtivoProvider` + `LekpisTopBar` + `<Outlet />`.
  - Se lista vazia → card "Você ainda não tem clientes" com CTA "Criar primeiro cliente" (link para `/lekpis/perfil`).
  - Se lista tem itens mas nenhum selecionado → tela "Escolher cliente para monitorar" com cards/lista dos clientes; clique salva no `localStorage` e entra na Home.
- Loading e erro tratados com skeleton simples + botão "Tentar novamente".

### 2. `src/contexts/cliente-ativo-context.tsx`
- Remover chamada automática de `ensureDefault` no boot (`useEffect` que dispara sem `clienteId`).
- Remover a lógica de fallback `cliente.ensure_default` / `cliente.list` do provider — agora o layout garante que só entra aqui com `clienteId` válido.
- Simplificar: provider vira um mero holder de `clienteId` (do localStorage) + `cliente` (via `cliente.get`) + `setClienteId` + novo `clearClienteId` (para trocar de cliente).
- Manter export de `useClienteAtivo` com a mesma API mínima usada pelos componentes (`clienteId`, `cliente`, `setClienteId`). Campos hoje pouco usados (`ensureDefault`, `ensuring`, `ensureError`, `hasNoClientes`, `loading`) deixam de existir.

### 3. Componentes que liam campos removidos
- `src/routes/_authenticated/lekpis.index.tsx`: remover os blocos "Nenhum cliente ativo" / "Selecione um cliente ativo" (agora impossíveis — o gate garante cliente). O componente pressupõe `clienteId` presente.
- Verificar `lekpis.integracoes.tsx`, `lekpis.perfil.tsx`, `lekpis.canal.$slug.tsx` e ajustar qualquer referência a `ensureDefault`/`ensuring`/`hasNoClientes` (trocar por lógica baseada apenas em `clienteId`).

### 4. TopBar: trocar cliente
- Em `src/components/lekpis/top-bar.tsx`, o `ClienteSelector` já permite trocar. Manter — apenas garantir que ele usa `setClienteId` do provider simplificado.
- Adicionar uma opção no dropdown "Trocar cliente…" que chama `clearClienteId` e volta para a tela de seleção (útil quando o usuário quer voltar à listagem).

## Detalhes técnicos (para revisão)
- A Home fica travada porque `ensureDefault` roda antes das queries e mantém `clienteId` nulo até completar; se o wrapper MCP demorasse ou retornasse envelope, o boot ficava em loop de retentativas. Retirando esse auto-ensure e movendo a escolha para uma tela explícita, o render fica determinístico.
- Persistência do cliente ativo continua em `localStorage` sob `lekpis:cliente-id`.
- Nenhuma mudança no `callLekpis` / `unwrapEnvelope` — o desembrulho segue como está.

## Não muda
- Layout visual da Home, Integrações, Perfil.
- Fluxo de OAuth do MCP.
- Server functions e API do LeKPIs.
