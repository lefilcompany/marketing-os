# Deepersona — Matriz de Testes RLS por Organização (Fase 4)

Objetivo: garantir que **leitura e escrita** de personas (e tabelas satélite consultadas no fluxo da Fase 4) respeitam a filiação de organização (`organization_members`) via `is_org_member` / `is_org_admin` / `is_superadmin`.

## Papéis usados nos testes

| Símbolo | Descrição |
|---|---|
| `U_A` | membro `active` da organização `ORG_A` (role `org_member`) |
| `A_A` | membro `active` da organização `ORG_A` com role `org_admin` |
| `U_B` | membro `active` da organização `ORG_B` |
| `X`   | usuário autenticado sem `organization_members` em `ORG_A` nem `ORG_B` |
| `SA`  | `superadmin` (linha em `user_global_roles`) |
| `AN`  | requisição `anon` (sem JWT) |

## Endpoints server-fn cobertos

Todos em `src/lib/*.functions.ts`, expostos via `createServerFn` + `requireSupabaseAuth`. O middleware injeta um cliente Supabase com o JWT do chamador → RLS aplica.

| Server fn | Tabela alvo | Ação | Política testada |
|---|---|---|---|
| `personas.listPersonas` | `personas` | SELECT | `org members read personas` |
| `personas.getPersona` | `personas` | SELECT | `org members read personas` |
| `personas.createPersona` | `personas` | INSERT | `org members write personas` |
| `personas.updatePersona` | `personas` | UPDATE | `org members update personas` |
| `personas.deletePersona` | `personas` | DELETE | `org admins delete personas` |
| `personas.generatePersonaBase` | `personas` | SELECT + UPDATE | read + update |
| `personas.generateICP` | `personas` | SELECT + UPDATE | read + update |
| `segments.listSegments` | `audience_segments` | SELECT | `org members read audience_segments` |
| `segments.createSegment` | `audience_segments` | INSERT | `org members insert audience_segments` |
| `csd.listCsdItems` | `csd_items` | SELECT | `org members read csd` |
| `research.listResearchSources` | `research_sources` | SELECT | `org members read research_sources` |
| `agents.listAgentsByPersona` | `persona_agents` + `personas` | SELECT | `org members read agents` + `read personas` |

## Matriz — resultado esperado

Legenda: ✅ permitido · ⛔ negado (0 linhas ou erro) · N/A não aplicável.

### `personas` (persona pertencente a `ORG_A`)

| Ação | U_A | A_A | U_B | X | SA | AN |
|---|---|---|---|---|---|---|
| SELECT (list/get) | ✅ | ✅ | ⛔ | ⛔ | ✅ | ⛔ |
| INSERT em `ORG_A` (created_by=self) | ✅ | ✅ | ⛔ | ⛔ | ⛔¹ | ⛔ |
| INSERT em `ORG_A` (organization_id=`ORG_B`) | ⛔ | ⛔ | — | — | — | ⛔ |
| UPDATE (patch descrição/dores/…) | ✅ | ✅ | ⛔ | ⛔ | ⛔¹ | ⛔ |
| DELETE | ⛔ | ✅ | ⛔ | ⛔ | ✅ | ⛔ |

¹ `is_superadmin` só está em SELECT/DELETE de `personas`; INSERT/UPDATE exigem `is_org_member`. Superadmin sem filiação recebe ⛔.

### `audience_segments`, `csd_items`, `research_sources`, `persona_agents` de `ORG_A`

| Ação | U_A | U_B | X | AN |
|---|---|---|---|---|
| SELECT | ✅ | ⛔ | ⛔ | ⛔ |
| INSERT (org=`ORG_A`, created_by=self) | ✅ | ⛔ | ⛔ | ⛔ |
| INSERT (org=`ORG_A`, created_by=outro) | ⛔ | — | — | — |
| UPDATE | ✅ | ⛔ | ⛔ | ⛔ |
| DELETE | ✅ | ⛔ | ⛔ | ⛔ |

## Cenários específicos da Fase 4

1. **"Virar persona"** (`segmentacao` → `createPersona` → `generatePersonaBase` → `generateICP`):
   - `U_A` sobre segmento de `ORG_A`: cadeia inteira ✅.
   - `U_B` chamando `createPersona` com `organizationId = ORG_A`: **INSERT deve falhar** (with_check). Também `getPersona` do id resultante deve retornar ⛔ para `U_B`.
2. **Salvar tudo** (`updatePersona`) em persona de `ORG_A` invocado por `U_B`: retorna **0 linhas afetadas** (UPDATE filtrado por RLS) e o server fn lança `"Persona não encontrada"` no `.single()` — cobrir esse caminho de erro.
3. **Barra de progresso**: `personaQ.refetchInterval` invoca `getPersona`. Se um `U_B` invadir a URL `/deepersona/<id-de-ORG_A>`, `getPersona` deve responder 404 (não expor `name/description`).
4. **Membro `status != active`**: `is_org_member` filtra por `status = 'active'` — usuários com status `pending`/`suspended` recebem ⛔ em todas as ações.

## Harness SQL

Rodar em ambiente de teste (nunca em produção) — cria dados descartáveis dentro de uma transação e sempre executa `ROLLBACK`.

Arquivo: [`scripts/rls/deepersona-rls.sql`](../../scripts/rls/deepersona-rls.sql).

```bash
psql "$SUPABASE_DB_URL" -f scripts/rls/deepersona-rls.sql
```

Cada bloco imprime `PASS`/`FAIL` por linha usando `RAISE NOTICE`. A tabela de saída deve conter apenas `PASS`.

## Cobertura de código (opcional)

Para um bug real, reproduzir com Playwright em duas contas (`U_A`, `U_B`) sequencialmente no preview, usando `LOVABLE_BROWSER_SUPABASE_*`. A leitura da UI (`/deepersona/<id>`) valida o comportamento end-to-end, além do teste SQL.
