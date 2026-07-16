# Erro para enviar ao time do Creator

O erro continua sendo o mesmo — HTTP 401, mas agora com o token do usuário `emanuel.rodrigues@lefil.com.br`.

## Resposta bruta do endpoint MCP do Creator

**Endpoint chamado:**
```
POST https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp
```

**Resposta:**
```
HTTP/1.1 401 Unauthorized
{"error":"unauthorized"}
```

## Token JWT que o Creator rejeitou (válido, emitido pelo próprio Supabase do Creator)

```
iss:       https://afxwqkrneraatgovhpkb.supabase.co/auth/v1
aud:       authenticated
sub:       ecb55ace-66b9-4f69-92fe-977aaa5c7d30
email:     emanuel.rodrigues@lefil.com.br
client_id: 6f5a7496-f3b5-4641-9acf-0f741e3f7ac7
scope:     profile email
iat:       1784234149  (recente)
exp:       1784237749  (futuro, ~1h de validade)
```

O JWT está bem formado, assinado pelo Auth do Creator, com `aud: authenticated`, `iat` recente e `exp` no futuro. Ainda assim a edge function `mcp` retorna `401 {"error":"unauthorized"}` já na chamada `initialize` do MCP.

## O que pedir ao time do Creator

Com esses campos (principalmente `sub`, `email`, `client_id`, `iat`) eles conseguem localizar nos logs da edge function `mcp` do projeto `afxwqkrneraatgovhpkb` **exatamente onde a autorização está negando** — provavelmente:

1. O usuário `ecb55ace-66b9-4f69-92fe-977aaa5c7d30` (`emanuel.rodrigues@lefil.com.br`) não está provisionado / não tem membership no app Creator; ou
2. O `client_id` `6f5a7496-...` (registrado via DCR) está marcado como inválido/revogado; ou
3. A função exige um scope adicional além de `profile email`.

## Nenhuma alteração no nosso lado

Nada muda em `mcp.server.ts`, `mcp.functions.ts` ou no card — o handshake OAuth está correto, o token é válido, quem nega é o Creator.
