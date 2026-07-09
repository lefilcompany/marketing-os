
-- Priorização: importância x urgência por persona
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS importance smallint,
  ADD COLUMN IF NOT EXISTS urgency smallint,
  ADD COLUMN IF NOT EXISTS priority_notes text;

ALTER TABLE public.personas
  ADD CONSTRAINT personas_importance_range CHECK (importance IS NULL OR importance BETWEEN 1 AND 5),
  ADD CONSTRAINT personas_urgency_range CHECK (urgency IS NULL OR urgency BETWEEN 1 AND 5);

-- Agentes IA: 1 ou mais agentes por persona
CREATE TABLE public.persona_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  tone text,
  system_prompt text NOT NULL,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  starter_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.persona_agents TO authenticated;
GRANT ALL ON public.persona_agents TO service_role;

ALTER TABLE public.persona_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read agents"
  ON public.persona_agents FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members insert agents"
  ON public.persona_agents FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members update agents"
  ON public.persona_agents FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members delete agents"
  ON public.persona_agents FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_persona_agents_org ON public.persona_agents(organization_id);
CREATE INDEX idx_persona_agents_persona ON public.persona_agents(persona_id);

CREATE TRIGGER tg_persona_agents_updated_at
  BEFORE UPDATE ON public.persona_agents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
