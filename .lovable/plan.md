# Diagnóstico — Creator retorna 0 ferramentas

## Descobertas

Não é problema de refresh token. O access token na tabela `mcp_connections` para o provider `creator` é **novo e válido**:

- `updated_at`: 2026-07-16 19:50:18 (há ~1 min quando o erro ocorreu)
- `expires_at`: 2026-07-16 20:50:17 (ainda válido por ~1h)
- `has_refresh`: true
- Formato: JWT HS256 legítimo do Supabase Auth do Creator

Payload decodificado do JWT:

```json
{
  "iss": "https://afxwqkrneraatgovhpkb.supabase.co/auth/v1",
  "aud": "authenticated",
  "sub": "ecb55ace-66b9-4f69-92fe-977aaa5c7d30",
  "email": "emanuel.rodrigues@lefil.com.br",
  "role": "authenticated",
  "client_id": "48310823-26db-4ce3-bd70-12707782ade9",
  "scope": "profile email",
  "exp": 1784235017
}
```

Ou seja: o Marketing OS envia um JWT recém-emitido, com `aud=authenticated`, header `apikey` do Creator setado (`CREATOR_SUPABASE_ANON_KEY` está nos secrets), e mesmo assim o endpoint `https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp` responde `{"error":"unauthorized"}`.

## Conclusão

O 401 **não vem do gateway do Supabase Auth** (esse retornaria `invalid JWT`). Vem de dentro do próprio edge function `mcp` do projeto **Creator** — é uma checagem de autorização de aplicação, não de identidade.

Hipóteses (a serem confirmadas do lado do Creator, não deste app):

1. O usuário `emanuel.rodrigues@lefil.com.br` (sub `ecb55ace-...`) **não tem perfil/organização/permissão** cadastrada no app Creator. O MCP checa `auth.uid()` contra tabelas próprias e rejeita.
2. O `scope` concedido (`profile email`) não é suficiente. O MCP pode exigir escopos custom (ex.: `tools:read`) que o `authorize` não solicita.
3. Um allowlist de `client_id` (Dynamic Client Registration criou um novo id `48310823-...`) que o Creator ainda não confia.

## Como confirmar

Não há como confirmar apenas com código deste app — precisa dos logs do edge function `mcp` do projeto Creator. Duas rotas:

- **A**. Pedir aos donos do Creator para inspecionar os logs do function `mcp` no timestamp `2026-07-16 19:50–19:51 UTC` procurando por “unauthorized” e ver qual condição disparou.
- **B**. Adicionar (do lado do Creator) log detalhado no início do handler MCP: `console.log("mcp auth", { userId, clientId, scope, aud, hasRow })` antes de qualquer 401.

## Próximos passos possíveis neste app

Nenhuma alteração de código deste app corrige o 401 — ele é um "não autorizado" emitido pelo Creator. Opções compatíveis com este projeto:

1. **Documentar dependência**: registrar em `.lovable/plan.md` que Creator MCP exige provisionamento do usuário no app Creator antes do OAuth funcionar.
2. **Melhorar UX**: quando `listMcpTools` devolver 401 mesmo com token fresco (idade < 5 min), trocar a mensagem de "Sessão expirada" para "Sem permissão no Creator — solicite acesso ao administrador do Creator". Continua sem tela em branco.
3. **Instrumentar**: logar do lado servidor deste app `client_id`, `sub`, `email`, `scope` (do payload do JWT, não o token) sempre que Creator devolver 401, para acelerar o suporte cruzado.

Recomendação: seguir **(2) + (3)** como próxima entrega mínima deste app, e paralelamente escalar para o time do Creator investigar seu edge function `mcp` (opção A ou B).

## Fora do escopo

- Nenhuma migração ou mudança de schema neste projeto.
- Nenhuma alteração no fluxo OAuth (registro/troca/refresh) — está correto.
- Não é caso de rotacionar `CREATOR_SUPABASE_ANON_KEY` (essa chave é usada só como `apikey` header e não afeta o 401 de dentro do function).
