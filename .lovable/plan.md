## Diagnóstico

O erro exibido não é bug do código do app — é uma validação do backend LeKPIs:

```
VALIDATION_ERROR: return_to host is not on the allowlist.
Contact the LeKPIs admin to add it.
```

Ao chamar `integracao.get_connect_url`, o app envia o `return_to` (URL da preview atual) para o LeKPIs iniciar o OAuth. O LeKPIs só aceita hosts previamente cadastrados numa allowlist por segurança (evita open-redirect). O host atual da preview não está cadastrado, então o LeKPIs rejeita antes mesmo de gerar a URL de conexão.

Hosts em uso neste projeto:
- Preview atual (id): `id-preview--c5174e53-8709-44c9-b05a-cb203adeba88.lovable.app`
- Preview estável: `project--c5174e53-8709-44c9-b05a-cb203adeba88-dev.lovable.app`
- Publicado: `pla-marketingos-lefil.lovable.app`

## O que fazer

Isto precisa ser resolvido do lado do LeKPIs (não há fix no código do app). Peça ao admin do LeKPIs para adicionar à allowlist de `return_to`:

1. `pla-marketingos-lefil.lovable.app` (produção)
2. `project--c5174e53-8709-44c9-b05a-cb203adeba88-dev.lovable.app` (preview estável — recomendado, não muda)
3. Opcionalmente `*.lovable.app` ou `id-preview--c5174e53-8709-44c9-b05a-cb203adeba88.lovable.app` (preview efêmera do editor)

## Melhoria opcional no app (posso implementar depois da liberação)

Tratar esse `VALIDATION_ERROR` em `use-lekpis-connect.ts` com uma mensagem amigável em vez do JSON cru — ex.: "Este domínio ainda não está autorizado no LeKPIs. Contate o admin para liberar `<host>`."

Confirma que só a mensagem amigável basta, ou quer que eu também force o `return_to` para o domínio publicado (fixo) quando o app rodar na preview?