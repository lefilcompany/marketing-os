# Por que o card do Creator mostra "0 ferramentas"

## Diagnóstico (log real, últimos minutos)

O servidor de MCP do Creator está rejeitando o `tools/list` com **HTTP 401 `{"error":"unauthorized"}`**, mesmo com um token de acesso perfeitamente válido:

```
[listMcpTools] creator 401: MCP HTTP 401
sub:        ecb55ace-66b9-4f69-92fe-977aaa5c7d30
email:      emanuel.rodrigues@lefil.com.br
client_id:  d1883e4f-cc9d-46b5-bfa5-70ced814cd77
scope:      profile email
aud:        authenticated
iss:        https://afxwqkrneraatgovhpkb.supabase.co/auth/v1
iat:        1784231808   (recente)
exp:        1784235408   (futuro)
```

O JWT está bem formado, com issuer correto do próprio Creator, `aud=authenticated`, expiração futura e emitido pelo servidor OAuth do Creator (foi ele que assinou). Ou seja: **o token é legítimo — quem está negando é a edge function `mcp` do projeto Creator**.

Como `listMcpTools` agora retorna `{ tools: [], error: ... }` em vez de lançar, a UI simplesmente conta 0 e mostra "0 ferramenta(s) MCP". Não há bug no nosso lado da pilha (auth-middleware, refresh de token, apikey do Supabase, envelope JSON-RPC) — a chamada chega ao servidor do Creator e é recusada lá.

## Por que 401 com token válido?

O único ator que pode responder isso é a edge function `mcp` do projeto Creator. As causas típicas (a decidir por eles nos logs do próprio Creator):

1. **Usuário não provisionado no Creator** — a função valida o JWT, extrai `sub`/`email` e checa se existe uma linha em alguma tabela de membros/permissões. Se não existir, devolve 401.
2. **Client OAuth revogado/bloqueado** — o `client_id` `d188…cd77` foi registrado via DCR mas o Creator marcou como inválido.
3. **Regra de escopo** — a edge function exige um scope adicional (além de `profile email`) e nega quando falta.
4. **Bug de leitura do header** — a função pode estar procurando `apikey` do Creator OU `Authorization` numa ordem que rejeita mesmo com bearer certo (menos provável, dado que outros usuários funcionam).

## Passos para resolver (a executar em build)

1. **Não** mexer em `mcp.server.ts`, `mcp.functions.ts` nem no card — a pilha está correta.
2. **Reconectar** o Creator em `Configurações → MCP` (Disconnect → Connect). Se a causa for token/refresh corrompido no lado deles, isso resolve.
3. Se persistir o 401, **enviar aos administradores do Creator** os campos acima (`sub`, `email`, `client_id`, `iat`, `exp`) para eles localizarem a rejeição nos logs da edge function `mcp` do projeto `afxwqkrneraatgovhpkb`. É lá que o motivo real está gravado — nós não temos acesso a esses logs a partir deste projeto.
4. Opcional (melhora só de UX): exibir no card a mensagem retornada em `probe.data.error` quando `tools.length === 0` e conectado — assim aparece "Sem permissão no Creator…" no lugar de "0 ferramenta(s)". Trocar em `src/components/tool-card.tsx` apenas o rótulo — nenhuma outra alteração.

## Arquivos que seriam tocados apenas se você aprovar o item 4

- `src/components/tool-card.tsx` — trocar o span de contagem por: se `probe.data?.error` → mostrar erro curto; senão → contagem.

Nada mais.
