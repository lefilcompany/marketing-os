
-- Fix search_path on trigger fn
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public/anon execute on helpers; only authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_has_app(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_has_app(uuid, uuid) TO authenticated, service_role;

-- Tighten uap_update WITH CHECK
DROP POLICY IF EXISTS "uap_update" ON public.user_application_permissions;
CREATE POLICY "uap_update" ON public.user_application_permissions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = user_application_permissions.organization_member_id
    AND (public.is_org_admin(auth.uid(), om.organization_id) OR public.is_superadmin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.id = user_application_permissions.organization_member_id
    AND (public.is_org_admin(auth.uid(), om.organization_id) OR public.is_superadmin(auth.uid()))
  )
);
