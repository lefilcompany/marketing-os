# Marketing OS — Plano de construção

Escopo enorme. Proponho entregar a **Fase 1 completa** (lobby funcional) com toda a fundação de arquitetura, banco e segurança já preparada para as Fases 2–4. Depois iteramos.

## O que entra na primeira entrega

**Fundação**
- Ativar Lovable Cloud (auth + DB + edge functions)
- Design system próprio do Marketing OS em `src/styles.css` (tokens neutros + cores de destaque por plataforma: Creator, SoMA, LeKPI, Deepersona)
- Layout com sidebar recolhível (desktop) + navegação inferior (mobile), header com WorkspaceSwitcher, busca global, notificações, avatar
- Command palette (Ctrl/⌘+K)

**Banco de dados (todas as tabelas do briefing, com RLS + GRANTs)**
`profiles`, `organizations`, `organization_members`, `applications`, `organization_applications`, `user_application_permissions`, `access_requests`, `application_access_logs`, `favorites`, `invitations`, `notifications`, `announcements`, `platform_status_history`, `audit_logs` + enums (`app_role`, `application_status`, `connection_mode`, etc.) + tabela separada de roles globais (`user_global_roles` para superadmin) usando o padrão `has_role` security-definer.

**Autenticação e onboarding**
- Login e-mail/senha + magic link + recuperação de senha + confirmação
- Aceite de convite por token
- Sem cadastro público (só via convite ou seed)
- Onboarding de primeiro acesso (nome, foto, tour das apps, favoritar)
- Rotas protegidas via `_authenticated/`

**Multiempresa**
- WorkspaceSwitcher no header, contexto global de workspace atual persistido
- Isolamento total via RLS baseado em `organization_members`
- Papéis: `superadmin` (global), `org_admin`, `member`, `viewer`

**Dashboard**
- Saudação personalizada
- "Continue seu trabalho" (últimos acessos reais)
- "Suas aplicações" (cards das apps liberadas para o workspace)
- Resumo do ecossistema (contadores reais, sem números fake)
- Comunicados
- Jornada do Marketing (Entender → Planejar → Executar → Medir)

**Catálogo `/aplicações`**
- Busca, filtros (categoria/status/disponibilidade), ordenação, grid/lista
- Cards liberados: "Abrir aplicação"; não liberados: "Solicitar acesso"
- Página de detalhes por app com bloco "Como se conecta ao Marketing OS"

**Redirecionamento seguro**
- Server function valida: auth → membership → org tem app → user tem permissão → registra log → devolve URL validada contra `allowed_domains`
- Abertura em nova aba por padrão, configurável
- Sem iframe

**Gestão**
- Página Equipe (admin): listar/convidar/remover/alterar papel/permissões por app
- Solicitações de acesso: criar (membro), aprovar/recusar (admin)
- Notificações: central, marcar lida, contador
- Atividades: histórico do usuário / da empresa / global (por papel)

**Painel Superadmin `/admin`**
- Visão geral, gestão de empresas, gestão de aplicações (cadastro completo com todas as propriedades do briefing), comunicados segmentados, status de plataformas

**Seed de demonstração** (migration separada, fácil de remover)
- 4 apps: Creator, SoMA, LeKPI, Deepersona (com URLs corretas e cores de destaque)
- 1 empresa demo, 1 superadmin, 1 admin, alguns membros, notificações, atividades, 1 comunicado, 1 solicitação pendente

**Preparação para SSO (sem implementar)**
- Campo `connection_mode` (`external_link` | `authenticated_link` | `sso`) já no schema
- Serviço abstrato de resolução de URL — hoje só modo 1 ativo

## Detalhes técnicos

- Stack: TanStack Start + React 19 + TS + Tailwind v4 + shadcn/ui + Lucide
- Server functions para toda leitura/escrita autenticada; edge routes apenas se precisar
- Superadmin verificado via `has_role(auth.uid(), 'superadmin')` em RLS e server fns
- Idioma da UI: **português (PT-BR)**
- Tema claro como padrão, tokens preparados para dark
- Sem dados/métricas inventados — empty states quando não houver dados

## O que NÃO entra agora (Fases 2–4)

- SSO real, geração de links assinados temporários
- Auditoria avançada com export, retenção configurável
- Métricas gráficas (só contadores por enquanto)
- Assistente IA
- Notificações por e-mail (só in-app)
- Realtime (arquitetura permite, mas ligamos depois)

## Perguntas antes de começar

1. Confirma **PT-BR** em toda a UI?
2. Posso criar você como **superadmin** usando o e-mail do seu login atual da Lovable? (necessário para você acessar `/admin` no primeiro login)
3. Quer que eu já configure **Google Sign-In** além de e-mail/senha e magic link?

Se aprovar, começo pela ativação do Cloud + design system + schema completo, depois auth, dashboard, catálogo, redirecionamento seguro, gestão, e por fim o painel superadmin.
