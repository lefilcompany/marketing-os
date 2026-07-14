## Objetivo
Fazer a Home do LeKPIs refletir corretamente as integrações e dados do cliente selecionado, como “Lefil Company”, após conectar uma conta/plataforma.

## O que deveria aparecer na Home
- O card do Instagram deveria mudar de “Não conectado” para conectado quando a integração existir para o cliente selecionado.
- Se o LeKPIs já tiver KPIs para esse cliente, o card deveria mostrar o indicador principal, por exemplo seguidores.
- O contador em “Integrações” deveria sair de `0 plataforma(s) conectada(s)` para a quantidade real.
- Se a conta está conectada mas ainda não existem métricas no LeKPIs, a tela deveria pelo menos indicar “conectado” e não continuar pedindo conexão.

## Plano de correção
1. Adicionar logs temporários no fluxo da Home para confirmar o retorno real de `integracao.list` para o cliente `Lefil Company`.
   - Logar o payload cru retornado pela chamada.
   - Logar os itens normalizados e o conjunto usado para decidir se Instagram/Facebook/Meta Ads estão conectados.

2. Corrigir o reconhecimento da integração conectada.
   - Aceitar tanto `platform` quanto `plataforma`, porque a API LeKPIs provavelmente retorna o campo em português.
   - Normalizar variações como `meta-ads` e `meta_ads` para evitar falso “não conectado”.
   - Garantir que o contador de integrações use uma lista normalizada, mesmo se o retorno vier envelopado diferente.

3. Melhorar o refresh após conectar.
   - Após receber o evento de conexão, invalidar/refazer as queries do LeKPIs.
   - Fazer um segundo refetch com pequeno atraso para cobrir o caso em que o LeKPIs confirma a conexão antes de persistir a integração.

4. Ajustar a Home para estados reais.
   - Se a integração estiver conectada mas ainda sem KPIs, o card deve mostrar estado conectado sem número, em vez de “Conectar Instagram”.
   - Manter o botão de conectar apenas quando a plataforma realmente não estiver conectada.

5. Remover os logs temporários depois de confirmar a causa.
   - Os logs `[DEBUG-ilist]` entram apenas para diagnóstico e saem no fix final.

## Arquivos envolvidos
- `src/hooks/use-lekpis-queries.ts`
- `src/routes/_authenticated/lekpis.index.tsx`
- Possivelmente `src/hooks/use-lekpis-connect.ts`, se o refresh pós-conexão precisar de ajuste fino.

## Validação
- Selecionar o cliente “Lefil Company”.
- Conectar Instagram.
- Verificar se a Home muda o card para conectado e atualiza o contador de integrações.
- Confirmar no console qual era o formato real retornado por `integracao.list` antes de remover os logs.