# Diagnóstico: lentidão ao trocar de rota no LeKPIs

## Sintoma
Ao entrar em `/lekpis` (ou voltar a ele de fora), o layout mostra um spinner por vários segundos antes de renderizar a Home. Trocar entre `/lekpis`, `/lekpis/integracoes` e `/lekpis/perfil` também dá impressão de "recarregar" o layout.

## O que está causando

Três chamadas seriais bloqueiam o primeiro render do layout:

1. **`getMcpConnection` (server function)** em `src/routes/_authenticated/lekpis.tsx` — sem `staleTime`, `retry: 0`. Como não tem cache configurado, ao entrar em `/lekpis` o layout fica preso no `if (connection.isLoading)` até a resposta do server → ida ao servidor → consulta ao Supabase. Isso é o principal fator do delay percebido.
2. **`clienteListOptions()`** dentro de `SelecionarClienteGate` — dispara `cliente.list` no MCP LeKPIs (round-trip completo pelo server fn `callMcpTool` → HTTPS externo). Enquanto não responde, o gate mostra outro spinner. Mesmo com `staleTime: 30_000`, a primeira montagem em cada sessão custa esse round trip inteiro antes do layout aparecer.
3. **Sem preload**: o router não está com `defaultPreload: "intent"`. Hover num link não pré-busca a rota nem os dados. Toda navegação paga o custo do lazy-load do chunk + queries.

Além disso, existem sinais menores:
- Aviso de hydration mismatch no `__root.tsx` (não causa lentidão, mas o React descarta a árvore e re-renderiza, o que pode piorar a percepção do primeiro paint).
- `LekpisTopBar` chama `useProfile()` — profile.get roda em outro round trip MCP; hoje já tem `staleTime: 60s`, ok, mas na primeira entrada bloqueia o header.

Entre rotas filhas (`/lekpis` ↔ `/lekpis/integracoes`), o layout **não** desmonta (é um layout route). O que "trava" nesse caso é a Home/Integrações começando a rodar suas próprias queries (`useIntegracoes`, `instagramKpisOptions`, etc.) — todas em série no MCP, cada uma um round trip.

## Plano para corrigir

### 1. Cachear a conexão MCP
Em `src/routes/_authenticated/lekpis.tsx`, adicionar `staleTime: 5 * 60_000` (ou mais) e `gcTime` maior no `useQuery` de `getMcpConnection`. A conexão muda raramente; invalidar só após `mcp:connected`/`disconnect` (já feito).

### 2. Fazer as pré-buscas no `loader` do layout
Adicionar `loader` na rota `lekpis.tsx` usando `context.queryClient.ensureQueryData` para:
- `getMcpConnection` (chave `["mcp-connection","lekpis"]`)
- `clienteListOptions()` (só se o `getMcpConnection` retornar conectado — checar cache pós-ensure)

Assim as duas queries rodam **em paralelo** e o navegador só transiciona para `/lekpis` quando estão prontas — usuário vê a página inteira aparecer de uma vez, sem duplo spinner.

### 3. Habilitar preload no router
Em `src/router.tsx`, setar `defaultPreload: "intent"`, `defaultPreloadDelay: 50` e (com Query) `defaultPreloadStaleTime: 0`. Hover em qualquer `<Link>` que aponte para `/lekpis*` pré-carrega o chunk + dados via loader.

### 4. Persistir e otimizar leitura do cliente ativo
`SelecionarClienteGate` hoje só decide após `cliente.list` responder. Com o loader do passo 2, a lista já vem no cache — o gate lê síncrono e decide sem spinner. Sem `localStorage` prévio → tela de escolha; com `localStorage` válido → entra direto na Home.

### 5. Pré-buscar dados da Home no seu próprio loader (opcional, incremental)
Nas rotas filhas (`lekpis.index.tsx`, `lekpis.integracoes.tsx`), adicionar `loader` que faz `ensureQueryData` para `integracaoListOptions(clienteId)`, `instagramKpisOptions(clienteId)`, etc., em paralelo. Requer ler `clienteId` via `context` (injetar via `beforeLoad` do layout que resolveu o cliente). Isso elimina o "aparecendo aos poucos" ao trocar de aba.

## Detalhes técnicos
- `beforeLoad` do layout resolve `clienteId` a partir de `localStorage` + validação contra `cliente.list` do cache, e injeta em `context.clienteId`. Filhos usam `context.clienteId` no loader para chamar as options funcs correspondentes.
- `getMcpConnection` continua rodando via `useQuery` no componente para reagir a `mcp:connected` postMessage; o loader apenas garante que a primeira leitura já vem quente.
- Hydration mismatch (`data-tsd-source` diverge entre server e client) é ruído do plugin de dev/anotação de fonte — não vamos tocar; se piorar, tratamos separado.

## Não muda
- Fluxo funcional (conectar → escolher cliente → home).
- Wrapper `callLekpis` / `unwrapEnvelope`.
- Componentes visuais.
