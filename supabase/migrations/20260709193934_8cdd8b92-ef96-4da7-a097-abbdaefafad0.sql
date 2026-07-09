
-- 1) Reset personas cleanly
DELETE FROM public.personas;

-- 2) Extend personas with Deepersona v2 canvas fields
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS quote text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS jtbd jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS motivations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS triggers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kpis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS values jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS behaviors jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3) CSD Matrix items
CREATE TYPE public.csd_category AS ENUM ('certainty', 'assumption', 'doubt');

CREATE TABLE public.csd_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category public.csd_category NOT NULL,
  text text NOT NULL,
  source text NOT NULL DEFAULT 'manual', -- manual | ai
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX csd_items_org_idx ON public.csd_items (organization_id, category, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.csd_items TO authenticated;
GRANT ALL ON public.csd_items TO service_role;

ALTER TABLE public.csd_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read csd" ON public.csd_items
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members insert csd" ON public.csd_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

CREATE POLICY "org members update csd" ON public.csd_items
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members delete csd" ON public.csd_items
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER csd_items_set_updated_at
  BEFORE UPDATE ON public.csd_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
