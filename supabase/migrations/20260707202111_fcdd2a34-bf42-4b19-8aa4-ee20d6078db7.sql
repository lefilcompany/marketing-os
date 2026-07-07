
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_global_role AS ENUM ('superadmin');
CREATE TYPE public.org_role AS ENUM ('org_admin', 'member', 'viewer');
CREATE TYPE public.org_status AS ENUM ('active', 'suspended', 'trial');
CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'disabled');
CREATE TYPE public.application_status AS ENUM ('available', 'unstable', 'maintenance', 'unavailable', 'coming_soon');
CREATE TYPE public.application_category AS ENUM ('strategy', 'content', 'operations', 'data_performance', 'artificial_intelligence', 'research_audience');
CREATE TYPE public.connection_mode AS ENUM ('external_link', 'authenticated_link', 'sso');
CREATE TYPE public.open_mode AS ENUM ('new_tab', 'same_tab');
CREATE TYPE public.org_app_status AS ENUM ('enabled', 'disabled', 'trial');
CREATE TYPE public.access_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error', 'announcement');
CREATE TYPE public.announcement_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE public.announcement_audience AS ENUM ('all', 'organizations', 'admins', 'app_users', 'roles');
CREATE TYPE public.access_log_event AS ENUM (
  'login', 'logout', 'app_open', 'app_open_denied',
  'access_requested', 'access_approved', 'access_rejected',
  'invite_sent', 'invite_accepted', 'invite_cancelled',
  'role_changed', 'app_granted', 'app_revoked',
  'org_created', 'org_updated', 'org_suspended', 'org_activated',
  'app_created', 'app_updated', 'app_status_changed',
  'settings_updated'
);

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  job_title TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- GLOBAL ROLES (superadmin table, separate from profiles)
-- ============================================================
CREATE TABLE public.user_global_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_global_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_global_roles TO authenticated;
GRANT ALL ON public.user_global_roles TO service_role;
ALTER TABLE public.user_global_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_global_roles WHERE user_id = _user_id AND role = 'superadmin');
$$;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  status public.org_status NOT NULL DEFAULT 'active',
  plan TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATION MEMBERS
-- ============================================================
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.org_role NOT NULL DEFAULT 'member',
  status public.member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user member of org?
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id AND organization_id = _org_id AND role = 'org_admin' AND status = 'active');
$$;

-- ============================================================
-- APPLICATIONS (catalog managed by superadmin)
-- ============================================================
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  category public.application_category NOT NULL DEFAULT 'operations',
  external_url TEXT NOT NULL,
  support_url TEXT,
  icon TEXT,
  logo_url TEXT,
  accent_color TEXT,
  status public.application_status NOT NULL DEFAULT 'available',
  connection_mode public.connection_mode NOT NULL DEFAULT 'external_link',
  open_mode public.open_mode NOT NULL DEFAULT 'new_tab',
  allowed_domains TEXT[] NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATION APPLICATIONS
-- ============================================================
CREATE TABLE public.organization_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status public.org_app_status NOT NULL DEFAULT 'enabled',
  plan_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, application_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_applications TO authenticated;
GRANT ALL ON public.organization_applications TO service_role;
ALTER TABLE public.organization_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.org_has_app(_org_id UUID, _app_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_applications WHERE organization_id = _org_id AND application_id = _app_id AND status = 'enabled');
$$;

-- ============================================================
-- USER APPLICATION PERMISSIONS
-- ============================================================
CREATE TABLE public.user_application_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  can_access BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_member_id, application_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_application_permissions TO authenticated;
GRANT ALL ON public.user_application_permissions TO service_role;
ALTER TABLE public.user_application_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ACCESS REQUESTS
-- ============================================================
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reason TEXT,
  status public.access_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- APPLICATION ACCESS LOGS
-- ============================================================
CREATE TABLE public.application_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  event_type public.access_log_event NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.application_access_logs TO authenticated;
GRANT ALL ON public.application_access_logs TO service_role;
ALTER TABLE public.application_access_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_access_logs_user ON public.application_access_logs(user_id, created_at DESC);
CREATE INDEX idx_access_logs_org ON public.application_access_logs(organization_id, created_at DESC);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, application_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type public.notification_type NOT NULL DEFAULT 'info',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'info',
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  audience_type public.announcement_audience NOT NULL DEFAULT 'all',
  audience_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  action_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PLATFORM STATUS HISTORY
-- ============================================================
CREATE TABLE public.platform_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status public.application_status NOT NULL,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_status_history TO authenticated;
GRANT ALL ON public.platform_status_history TO service_role;
ALTER TABLE public.platform_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles: user reads/updates own; superadmin all
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_superadmin(auth.uid()))
WITH CHECK (id = auth.uid() OR public.is_superadmin(auth.uid()));

-- Members of same org can view each other's basic profile via a join view? Simpler: allow SELECT for shared org members
CREATE POLICY "profiles_shared_org" ON public.profiles FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.organization_members m1
  JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
  WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
));

-- user_global_roles: only superadmin reads/writes; user can see own
CREATE POLICY "global_roles_self" ON public.user_global_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));

-- organizations: members see; superadmin all
CREATE POLICY "org_member_select" ON public.organizations FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org_admin_update" ON public.organizations FOR UPDATE TO authenticated
USING (public.is_org_admin(auth.uid(), id) OR public.is_superadmin(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid(), id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org_super_insert" ON public.organizations FOR INSERT TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()));

-- organization_members
CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_org_member(auth.uid(), organization_id)
  OR public.is_superadmin(auth.uid())
);
CREATE POLICY "org_members_admin_write" ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org_members_admin_update" ON public.organization_members FOR UPDATE TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org_members_admin_delete" ON public.organization_members FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

-- applications: all authenticated can SELECT visible ones; only superadmin writes
CREATE POLICY "apps_select" ON public.applications FOR SELECT TO authenticated
USING (is_visible = true OR public.is_superadmin(auth.uid()));
CREATE POLICY "apps_super_write" ON public.applications FOR INSERT TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "apps_super_update" ON public.applications FOR UPDATE TO authenticated
USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "apps_super_delete" ON public.applications FOR DELETE TO authenticated
USING (public.is_superadmin(auth.uid()));

-- organization_applications: members read; superadmin all
CREATE POLICY "org_apps_select" ON public.organization_applications FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "org_apps_super_write" ON public.organization_applications FOR INSERT TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "org_apps_super_update" ON public.organization_applications FOR UPDATE TO authenticated
USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "org_apps_super_delete" ON public.organization_applications FOR DELETE TO authenticated
USING (public.is_superadmin(auth.uid()));

-- user_application_permissions: org admins manage; user reads own
CREATE POLICY "uap_select" ON public.user_application_permissions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = user_application_permissions.organization_member_id
    AND (om.user_id = auth.uid() OR public.is_org_admin(auth.uid(), om.organization_id) OR public.is_superadmin(auth.uid()))
  )
);
CREATE POLICY "uap_write" ON public.user_application_permissions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = user_application_permissions.organization_member_id
    AND (public.is_org_admin(auth.uid(), om.organization_id) OR public.is_superadmin(auth.uid()))
  )
);
CREATE POLICY "uap_update" ON public.user_application_permissions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = user_application_permissions.organization_member_id
    AND (public.is_org_admin(auth.uid(), om.organization_id) OR public.is_superadmin(auth.uid()))
  )
) WITH CHECK (true);
CREATE POLICY "uap_delete" ON public.user_application_permissions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = user_application_permissions.organization_member_id
    AND (public.is_org_admin(auth.uid(), om.organization_id) OR public.is_superadmin(auth.uid()))
  )
);

-- access_requests
CREATE POLICY "ar_select" ON public.access_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "ar_insert" ON public.access_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "ar_update" ON public.access_requests FOR UPDATE TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

-- access logs
CREATE POLICY "logs_select" ON public.application_access_logs FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
  OR public.is_superadmin(auth.uid())
);
CREATE POLICY "logs_insert" ON public.application_access_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- favorites
CREATE POLICY "fav_select" ON public.favorites FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "fav_insert" ON public.favorites FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "fav_delete" ON public.favorites FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- invitations
CREATE POLICY "inv_select" ON public.invitations FOR SELECT TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "inv_insert" ON public.invitations FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));
CREATE POLICY "inv_update" ON public.invitations FOR UPDATE TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id) OR public.is_superadmin(auth.uid()));

-- notifications
CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_superadmin(auth.uid()) OR public.is_org_admin(auth.uid(), organization_id));

-- announcements
CREATE POLICY "ann_select" ON public.announcements FOR SELECT TO authenticated
USING (published_at IS NOT NULL AND published_at <= now() AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "ann_super_all" ON public.announcements FOR ALL TO authenticated
USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- platform_status_history
CREATE POLICY "psh_select" ON public.platform_status_history FOR SELECT TO authenticated
USING (true);
CREATE POLICY "psh_super_write" ON public.platform_status_history FOR ALL TO authenticated
USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- audit_logs
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated
USING (
  actor_user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
  OR public.is_superadmin(auth.uid())
);
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (actor_user_id = auth.uid() OR public.is_superadmin(auth.uid()));

-- ============================================================
-- Timestamp trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_orgs_upd BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_members_upd BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_apps_upd BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_orgapps_upd BEFORE UPDATE ON public.organization_applications FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_uap_upd BEFORE UPDATE ON public.user_application_permissions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_ar_upd BEFORE UPDATE ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER t_ann_upd BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- Auto profile creation on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Seed applications (Creator, SoMA, LeKPI, Deepersona)
-- ============================================================
INSERT INTO public.applications (name, slug, short_description, full_description, category, external_url, allowed_domains, accent_color, icon, is_featured, sort_order, features, benefits) VALUES
('Creator', 'creator',
  'Planeje, crie, revise e transforme conteúdos com inteligência artificial.',
  'O Creator é a plataforma da LeFil para planejamento, produção e revisão de conteúdo com o apoio de inteligência artificial. Transforme estratégia em peças, roteiros e textos prontos para publicação.',
  'content',
  'https://pla.creator.lefil.com.br/',
  ARRAY['pla.creator.lefil.com.br'],
  '#8B5CF6', 'Sparkles', true, 10,
  '["Planejamento de conteúdo","Produção assistida por IA","Revisão colaborativa","Transformação entre formatos"]'::jsonb,
  'Acelere a produção de conteúdo mantendo qualidade e consistência editorial.'),
('SoMA', 'soma',
  'Organize demandas, fluxos, projetos e entregas da sua operação de marketing.',
  'O SoMA é o sistema operacional da execução de marketing: demandas, projetos, prazos, responsáveis e fluxos de aprovação, em um único lugar.',
  'operations',
  'https://pla.soma.lefil.com.br/',
  ARRAY['pla.soma.lefil.com.br'],
  '#0EA5E9', 'Kanban', true, 20,
  '["Gestão de demandas","Fluxos configuráveis","Acompanhamento de projetos","Visibilidade de entregas"]'::jsonb,
  'Traga previsibilidade e organização para toda a operação de marketing.'),
('LeKPI', 'lekpi',
  'Centralize seus indicadores e acompanhe a performance do marketing em um só lugar.',
  'O LeKPI centraliza métricas de marketing de diferentes fontes em dashboards consolidados, prontos para decisão.',
  'data_performance',
  'http://pla.lekpis.lefil.com.br/',
  ARRAY['pla.lekpis.lefil.com.br'],
  '#10B981', 'BarChart3', true, 30,
  '["Consolidação de fontes","Dashboards prontos","Acompanhamento de metas","Alertas de performance"]'::jsonb,
  'Tenha visão única e confiável do desempenho de marketing.'),
('Deepersona', 'deepersona',
  'Crie personas mais profundas e transforme dados sobre públicos em direcionamentos estratégicos.',
  'A Deepersona utiliza inteligência artificial para aprofundar personas e traduzir públicos em direcionamentos estratégicos acionáveis.',
  'research_audience',
  'https://pla.deepersona.lefil.com.br/',
  ARRAY['pla.deepersona.lefil.com.br'],
  '#F59E0B', 'Users', true, 40,
  '["Criação de personas","Análise comportamental","Direcionamentos estratégicos","Insights de audiência"]'::jsonb,
  'Entenda profundamente seu público e direcione a estratégia com precisão.');
