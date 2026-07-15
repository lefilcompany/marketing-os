## Objetivo

Reestruturar a navegação em torno dos 5 módulos A · E · I · O · U:

1. **Home (`/dashboard`)** — mostrar apenas 5 cards (um por módulo), com letra, nome e descrição do que aquele módulo faz. Sem listar ferramentas.
2. **Menu lateral** — substituir a seção "Módulos" atual (DeePersona, Estrategia, Creator, Soma, Comunidades, LeKPIs) por 5 itens: **A – Ambiente**, **E – Estratégia**, **I – Interações**, **O – Operações**, **U – Unificação**.
3. **Página de módulo (`/modulo/$letra`)** — ao clicar em um item do menu (ou em um card da home), abre uma página que lista as ferramentas daquele módulo (usando o `ToolCard` já existente, com marca por ferramenta e status ready/coming_soon).

## Arquivos afetados

**Novos**
- `src/routes/_authenticated/modulo.$letra.tsx` — rota dinâmica que resolve a letra (A/E/I/O/U), lê `AEIOU_MODULES` e renderiza cabeçalho do módulo + grade de `ToolCard`. Redireciona para `/dashboard` se a letra for inválida.

**Editados**
- `src/routes/_authenticated/dashboard.tsx` — remove os blocos com ferramentas; renderiza 5 cards grandes (letra gigante + nome + tagline) que linkam para `/modulo/A`… `/modulo/U`. Mantém o header/ambiente atual.
- `src/components/app-shell.tsx` — na `SidebarGroup` "Módulos", troca a lista atual por 5 itens A/E/I/O/U (ícone = letra em círculo colorido, `to="/modulo/A"` etc.). Remove imports de logos que ficarem sem uso.
- `src/lib/aeiou-modules.ts` — adiciona helper `getModuleByLetter(letter)` para reuso.

## Fora do escopo

- Não remover rotas antigas (`/deepersona`, `/creator`, `/soma`, `/lekpis`, `/estrategia`, `/comunidades`) — continuam funcionando; apenas deixam de aparecer no menu principal. Os `ToolCard`s da página de módulo continuam apontando para `platformUrl` externo como hoje.
- Sem mudanças em backend, MCP ou tabela `tool_brand_settings`.

## Detalhes técnicos

- Rota dinâmica: `createFileRoute('/_authenticated/modulo/$letra')` com `params: { letra: string }`; normaliza para maiúscula e valida contra `["A","E","I","O","U"]`.
- Home: grid `sm:grid-cols-2 lg:grid-cols-3` com o quinto card ocupando espaço central; cada card é um `<Link to="/modulo/$letra" params={{ letra: mod.letter }}>` estilizado com o `color` do módulo (mesmo tratamento visual usado em `dashboards.tsx`).
- Sidebar: item usa um badge circular com a letra + label `Ambiente/Estratégia/…`; `isActive` casa com `pathname === "/modulo/A"` etc.
