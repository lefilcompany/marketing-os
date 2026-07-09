
-- Helper: shared trigger already exists (tg_set_updated_at)

-- ============================================================
-- 1. PERSONAS
-- ============================================================
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
  pains JSONB NOT NULL DEFAULT '[]'::jsonb,
  gains JSONB NOT NULL DEFAULT '[]'::jsonb,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personas TO authenticated;
GRANT ALL ON public.personas TO service_role;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read personas" ON public.personas FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write personas" ON public.personas FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update personas" ON public.personas FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete personas" ON public.personas FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER personas_updated_at BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_personas_org ON public.personas(organization_id);

-- ============================================================
-- 2. STRATEGIES
-- ============================================================
CREATE TABLE public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT,
  positioning TEXT,
  value_proposition TEXT,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  frameworks JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read strategies" ON public.strategies FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write strategies" ON public.strategies FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update strategies" ON public.strategies FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete strategies" ON public.strategies FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER strategies_updated_at BEFORE UPDATE ON public.strategies
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_strategies_org ON public.strategies(organization_id);

-- ============================================================
-- 3. CAMPAIGNS
-- ============================================================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT,
  channel TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  kpis JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read campaigns" ON public.campaigns FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write campaigns" ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update campaigns" ON public.campaigns FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete campaigns" ON public.campaigns FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_campaigns_org ON public.campaigns(organization_id);

-- ============================================================
-- 4. PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  due_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read projects" ON public.projects FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete projects" ON public.projects FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_projects_org ON public.projects(organization_id);

-- ============================================================
-- 5. TASKS
-- ============================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  due_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_tasks_org ON public.tasks(organization_id);

-- ============================================================
-- 6. COMMUNITIES
-- ============================================================
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  community_type TEXT,
  platform TEXT,
  members_estimated INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read communities" ON public.communities FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write communities" ON public.communities FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update communities" ON public.communities FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete communities" ON public.communities FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER communities_updated_at BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_communities_org ON public.communities(organization_id);

-- ============================================================
-- 7. KPI SNAPSHOTS
-- ============================================================
CREATE TABLE public.kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  target NUMERIC,
  unit TEXT,
  period_start DATE,
  period_end DATE,
  module TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_snapshots TO authenticated;
GRANT ALL ON public.kpi_snapshots TO service_role;
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read kpis" ON public.kpi_snapshots FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org admins write kpis" ON public.kpi_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org admins update kpis" ON public.kpi_snapshots FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org admins delete kpis" ON public.kpi_snapshots FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER kpi_snapshots_updated_at BEFORE UPDATE ON public.kpi_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_kpi_org ON public.kpi_snapshots(organization_id);

-- ============================================================
-- 8. COPILOT RECOMMENDATIONS
-- ============================================================
CREATE TABLE public.copilot_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  module TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  action_hint TEXT,
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_recommendations TO authenticated;
GRANT ALL ON public.copilot_recommendations TO service_role;
ALTER TABLE public.copilot_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read copilot" ON public.copilot_recommendations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write copilot" ON public.copilot_recommendations FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update copilot" ON public.copilot_recommendations FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete copilot" ON public.copilot_recommendations FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER copilot_updated_at BEFORE UPDATE ON public.copilot_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_copilot_org ON public.copilot_recommendations(organization_id);

-- ============================================================
-- 9. LIBRARY ITEMS
-- ============================================================
CREATE TABLE public.library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read library" ON public.library_items FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org members write library" ON public.library_items FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members update library" ON public.library_items FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org admins delete library" ON public.library_items FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE TRIGGER library_updated_at BEFORE UPDATE ON public.library_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_library_org ON public.library_items(organization_id);
