-- Deepersona RLS harness (Fase 4)
-- Executar em ambiente de teste. Toda a execução acontece dentro de uma
-- transação encerrada com ROLLBACK — nenhum dado é persistido.
--
-- Estratégia: usar `SET LOCAL role authenticated` + `SET LOCAL
-- request.jwt.claims` para simular a identidade que o Data API/PostgREST
-- injeta em cada request. Assim as políticas `is_org_member/...` são
-- avaliadas exatamente como em produção.
--
-- Uso:
--   psql "$SUPABASE_DB_URL" -f scripts/rls/deepersona-rls.sql

\set ON_ERROR_STOP on
\pset pager off

BEGIN;

-- ---------------------------------------------------------------------------
-- Seed determinístico (UUIDs fixos, escopo local à transação)
-- ---------------------------------------------------------------------------
DO $seed$
DECLARE
  org_a uuid := '11111111-1111-1111-1111-111111111111';
  org_b uuid := '22222222-2222-2222-2222-222222222222';
  u_a   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  a_a   uuid := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  u_b   uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  x     uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  sa    uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  persona_a uuid := '55555555-5555-5555-5555-555555555555';
BEGIN
  INSERT INTO public.organizations (id, name, slug)
  VALUES (org_a, 'Org A', 'org-a'), (org_b, 'Org B', 'org-b');

  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES
    (org_a, u_a, 'org_member', 'active'),
    (org_a, a_a, 'org_admin',  'active'),
    (org_b, u_b, 'org_member', 'active');

  INSERT INTO public.user_global_roles (user_id, role) VALUES (sa, 'superadmin');

  INSERT INTO public.personas (id, organization_id, created_by, name, stage, status)
  VALUES (persona_a, org_a, u_a, 'Persona ORG_A', 'draft', 'draft');

  INSERT INTO public.audience_segments (organization_id, created_by, name)
  VALUES (org_a, u_a, 'Seg A');
  INSERT INTO public.csd_items (organization_id, created_by, category, content)
  VALUES (org_a, u_a, 'certainty', 'Certeza A');
  INSERT INTO public.research_sources (organization_id, created_by, title, kind)
  VALUES (org_a, u_a, 'Fonte A', 'link');
END
$seed$;

-- ---------------------------------------------------------------------------
-- Helper: roda como usuário autenticado com claim `sub`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.assert_rls(
  label text,
  user_id uuid,
  expected_count int,
  sql text
) RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE actual int;
BEGIN
  EXECUTE format('SET LOCAL role authenticated');
  EXECUTE format('SET LOCAL "request.jwt.claims" TO %L', json_build_object('sub', user_id, 'role','authenticated')::text);
  EXECUTE 'SELECT count(*)::int FROM (' || sql || ') s' INTO actual;
  RESET role;
  RAISE NOTICE '% -> expected=% actual=% [%]',
    label, expected_count, actual,
    CASE WHEN actual = expected_count THEN 'PASS' ELSE 'FAIL' END;
END
$fn$;

-- ---------------------------------------------------------------------------
-- Casos — persona pertencente a ORG_A
-- ---------------------------------------------------------------------------
DO $tests$
DECLARE
  u_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  a_a uuid := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  u_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  x   uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  sa  uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
  -- SELECT personas
  PERFORM pg_temp.assert_rls('personas.select U_A', u_a, 1,
    $$SELECT id FROM public.personas WHERE name = 'Persona ORG_A'$$);
  PERFORM pg_temp.assert_rls('personas.select U_B', u_b, 0,
    $$SELECT id FROM public.personas WHERE name = 'Persona ORG_A'$$);
  PERFORM pg_temp.assert_rls('personas.select X (sem org)', x, 0,
    $$SELECT id FROM public.personas WHERE name = 'Persona ORG_A'$$);
  PERFORM pg_temp.assert_rls('personas.select SA (superadmin)', sa, 1,
    $$SELECT id FROM public.personas WHERE name = 'Persona ORG_A'$$);

  -- SELECT satélites
  PERFORM pg_temp.assert_rls('segments.select U_A', u_a, 1,
    $$SELECT id FROM public.audience_segments WHERE name = 'Seg A'$$);
  PERFORM pg_temp.assert_rls('segments.select U_B', u_b, 0,
    $$SELECT id FROM public.audience_segments WHERE name = 'Seg A'$$);
  PERFORM pg_temp.assert_rls('csd.select U_B',    u_b, 0,
    $$SELECT id FROM public.csd_items WHERE content = 'Certeza A'$$);
  PERFORM pg_temp.assert_rls('research.select U_B', u_b, 0,
    $$SELECT id FROM public.research_sources WHERE title = 'Fonte A'$$);
END
$tests$;

-- ---------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE de U_B em recursos de ORG_A (devem falhar)
-- ---------------------------------------------------------------------------
DO $writes$
DECLARE
  org_a uuid := '11111111-1111-1111-1111-111111111111';
  u_a   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  a_a   uuid := 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
  u_b   uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  persona_a uuid := '55555555-5555-5555-5555-555555555555';
  denied boolean;
BEGIN
  -- U_B tenta INSERT em ORG_A
  SET LOCAL role authenticated;
  SET LOCAL "request.jwt.claims" TO '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';
  BEGIN
    INSERT INTO public.personas (organization_id, created_by, name)
      VALUES (org_a, u_b, 'Invasor');
    denied := false;
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN denied := true; END;
  RAISE NOTICE 'personas.insert U_B em ORG_A -> denied=% [%]', denied,
    CASE WHEN denied THEN 'PASS' ELSE 'FAIL' END;

  -- U_B tenta UPDATE
  BEGIN
    UPDATE public.personas SET description = 'hack' WHERE id = persona_a;
    denied := (NOT FOUND); -- update filtrado por RLS: 0 linhas
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  RAISE NOTICE 'personas.update U_B em ORG_A -> denied=% [%]', denied,
    CASE WHEN denied THEN 'PASS' ELSE 'FAIL' END;

  -- U_B tenta DELETE
  BEGIN
    DELETE FROM public.personas WHERE id = persona_a;
    denied := (NOT FOUND);
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  RAISE NOTICE 'personas.delete U_B em ORG_A -> denied=% [%]', denied,
    CASE WHEN denied THEN 'PASS' ELSE 'FAIL' END;

  RESET role;

  -- U_A INSERT/UPDATE deve passar
  SET LOCAL role authenticated;
  SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
  BEGIN
    INSERT INTO public.personas (organization_id, created_by, name)
      VALUES (org_a, u_a, 'Nova');
    denied := false;
  EXCEPTION WHEN OTHERS THEN denied := true; END;
  RAISE NOTICE 'personas.insert U_A em ORG_A -> allowed=% [%]', NOT denied,
    CASE WHEN NOT denied THEN 'PASS' ELSE 'FAIL' END;

  UPDATE public.personas SET description = 'ok' WHERE id = persona_a;
  RAISE NOTICE 'personas.update U_A em ORG_A -> rows=% [%]', 1,
    CASE WHEN FOUND THEN 'PASS' ELSE 'FAIL' END;
  RESET role;

  -- Membro (U_A) NÃO deve conseguir DELETE (só admin)
  SET LOCAL role authenticated;
  SET LOCAL "request.jwt.claims" TO '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';
  DELETE FROM public.personas WHERE id = persona_a;
  RAISE NOTICE 'personas.delete U_A (membro) -> rows=% [%]', 0,
    CASE WHEN NOT FOUND THEN 'PASS' ELSE 'FAIL' END;
  RESET role;

  -- Admin (A_A) deve conseguir DELETE
  SET LOCAL role authenticated;
  SET LOCAL "request.jwt.claims" TO '{"sub":"a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1","role":"authenticated"}';
  DELETE FROM public.personas WHERE id = persona_a;
  RAISE NOTICE 'personas.delete A_A (admin) -> rows=% [%]', 1,
    CASE WHEN FOUND THEN 'PASS' ELSE 'FAIL' END;
  RESET role;
END
$writes$;

-- ---------------------------------------------------------------------------
-- Anônimo não vê nada
-- ---------------------------------------------------------------------------
DO $anon$
DECLARE c int;
BEGIN
  SET LOCAL role anon;
  SELECT count(*) INTO c FROM public.personas;
  RAISE NOTICE 'personas.select AN -> count=% [%]', c,
    CASE WHEN c = 0 THEN 'PASS' ELSE 'FAIL' END;
  RESET role;
END
$anon$;

ROLLBACK;
