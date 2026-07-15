## Mudanças

**1. Remover a barra de fluxo fixa no topo**
- Em `src/components/app-shell.tsx`: remover o `<GuidedFlowBar />` renderizado entre o header e o `<main>`, e o import correspondente.
- Não remover o arquivo `src/components/guided-flow-bar.tsx` (fora do escopo) — apenas deixa de ser exibido.

**2. Redesenhar os cards de módulo da Home**
Em `src/routes/_authenticated/dashboard.tsx`, refazer o `ModuleCard` para priorizar legibilidade:

- Fundo **branco sólido** (`bg-white`) com borda sutil e sombra suave; sem gradiente translúcido de fundo.
- Uma **faixa/topo colorida** com o `mod.color` (barra superior de ~6px + halo suave no canto) para manter a identidade cromática do módulo sem invadir a área de texto.
- **Badge da letra**: círculo/quadrado preenchido com `mod.color` e letra branca (alto contraste, mantém identidade).
- **Título** (`Módulo X — Nome`) em `text-foreground` (quase preto).
- **Tagline** em `text-muted-foreground`.
- Ícone `ArrowUpRight` em `text-muted-foreground`, que ganha `mod.color` no hover.
- Hover: leve elevação (`-translate-y-0.5`), sombra um pouco mais forte, borda tinge com `mod.color`.
- Manter grid `sm:grid-cols-2 lg:grid-cols-3` e link para `/modulo/$letra`.

Sem mudanças em backend, rotas, sidebar ou página `/modulo/$letra`.
