
-- Research sources (Coleta de dados) ------------------------------------
CREATE TABLE public.research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  csd_item_id UUID REFERENCES public.csd_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'interview' CHECK (kind IN ('interview','survey','analytics','social','crm','desk','other')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','collecting','analyzed','archived')),
  summary TEXT,
  url TEXT,
  notes TEXT,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_sources TO authenticated;
GRANT ALL ON public.research_sources TO service_role;

ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read research_sources"
  ON public.research_sources FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

CREATE POLICY "org members insert research_sources"
  ON public.research_sources FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

CREATE POLICY "org members update research_sources"
  ON public.research_sources FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members delete research_sources"
  ON public.research_sources FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

CREATE TRIGGER trg_research_sources_updated
  BEFORE UPDATE ON public.research_sources
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_research_sources_org ON public.research_sources(organization_id);
CREATE INDEX idx_research_sources_csd ON public.research_sources(csd_item_id);

-- Audience segments (Segmentação / Clusters) ----------------------------
CREATE TABLE public.audience_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hypothesis TEXT,
  size_estimate TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  color TEXT,
  characteristics JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audience_segments TO authenticated;
GRANT ALL ON public.audience_segments TO service_role;

ALTER TABLE public.audience_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read audience_segments"
  ON public.audience_segments FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

CREATE POLICY "org members insert audience_segments"
  ON public.audience_segments FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND created_by = auth.uid());

CREATE POLICY "org members update audience_segments"
  ON public.audience_segments FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "org members delete audience_segments"
  ON public.audience_segments FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

CREATE TRIGGER trg_audience_segments_updated
  BEFORE UPDATE ON public.audience_segments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_audience_segments_org ON public.audience_segments(organization_id);
CREATE INDEX idx_audience_segments_persona ON public.audience_segments(persona_id);
