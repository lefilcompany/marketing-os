## Diagnóstico

A toast "Nenhum cliente ativo. Crie ou selecione um cliente em Perfil." é disparada pelo próprio `useLekpisConnect`, no ramo em que `ensureDefault()` retorna `null`. No screenshot, a lista "Selecionar cliente..." está vazia e os cards estão todos "Não conectado" — ou seja, **o usuário ainda não tem nenhum cliente cadastrado no LeKPIs**. Como `cliente.list` volta vazio e `cliente.ensure_default` não cria automaticamente, `clienteId` fica `null` para sempre e o botão Conectar só serve para mostrar o toast.

Isso não é bug de OAuth: é UX. O fluxo precisa levar o usuário a criar/selecionar um cliente antes de tentar conectar plataforma.

## Mudanças

### 1. `src/hooks/use-lekpis-connect.ts`
Quando `ensureDefault()` retorna `null`, em vez de só toastar:
- Mostrar toast com ação "Ir para Perfil" (usar `toast.error(msg, { action: { label, onClick } })` do sonner) que navega para `/lekpis/perfil`.
- Fechar o popup silenciosamente (já faz).
- Não mudar o restante do fluxo OAuth.

Receberá `navigate` via `useNavigate()` do TanStack Router.

### 2. `src/routes/_authenticated/lekpis.integracoes.tsx`
Adicionar o mesmo padrão de banner que a Home já tem, mas para o caso `!clienteId && !ensureError` (sem erro, apenas sem cliente):
- Card em destaque acima do grid: "Você ainda não tem um cliente ativo. Crie um em Perfil antes de conectar plataformas."
- Botão "Ir para Perfil" (Link para `/lekpis/perfil`).
- Desabilitar visualmente os `IntegracaoCard` (passar prop `disabled`) enquanto `!clienteId`.

### 3. `src/routes/_authenticated/lekpis.index.tsx`
Mesmo tratamento: quando `!clienteId && !ensureError`, exibir banner "Crie seu primeiro cliente" com CTA para `/lekpis/perfil`. Os `CanalCard` continuam mostrando "Conectar", mas com `disabled` visual.

### 4. `src/components/lekpis/integracao-card.tsx` e `canal-card.tsx`
Aceitar prop opcional `disabled?: boolean`; quando true, botão Conectar fica desabilitado com tooltip/hint "Selecione um cliente primeiro". Nenhuma outra mudança visual.

### 5. `src/contexts/cliente-ativo-context.tsx`
Ajuste pequeno: quando `cliente.list` retorna `items: []` (não é erro), ainda assim expor um estado `hasNoClientes: boolean` para diferenciar "erro" de "sem clientes". `ensureError` continua só para falhas reais.

## Fora de escopo

- Não altera `mcp-proxy`, `callMcpTool`, tabela `lekpis_connections`, callback OAuth.
- Não muda shape de tools do LeKPIs.
- Não adiciona criação automática de cliente (mantém opt-in via Perfil).
