## Objetivo
Liberar acesso do usuário `joao.mendes.ext@lefil.com.br` na organização **LeFil**.

## Estado atual (verificado)
- Perfil existe: `id = 19173855-1651-4c07-aafe-5dd7c57aaaf5` (nome: "joao mendes").
- Organização LeFil: `id = ef0abbc7-e0e1-439f-9588-065a4d331e1f`.
- Ele **não** é membro dela ainda (`organization_members` sem registro).

## Ação
Inserir uma linha em `public.organization_members` via `supabase--insert`:

```sql
INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
VALUES (
  'ef0abbc7-e0e1-439f-9588-065a4d331e1f',
  '19173855-1651-4c07-aafe-5dd7c57aaaf5',
  'member',
  'active',
  now()
);
```

Assim ele passa a ver a LeFil no seletor de workspace e a acessar todas as aplicações já habilitadas para a organização (o acesso a apps segue `organization_applications`, que já está populado para a LeFil). Se você quiser que ele seja **admin** da organização em vez de `member`, me diga antes de aplicar.

## Fora de escopo
- Não vou promovê-lo a `superadmin` global.
- Não vou mexer em `user_application_permissions` (permissões por app individual) — só faria sentido se você quiser restringir a apps específicos.
