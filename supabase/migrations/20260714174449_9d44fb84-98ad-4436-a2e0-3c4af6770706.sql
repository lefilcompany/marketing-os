
-- Add workspace + encrypted token columns to mcp_connections
ALTER TABLE public.mcp_connections
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS access_token_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS token_encryption_version smallint;

-- Replace old unique (user_id, provider) with workspace-aware unique index.
ALTER TABLE public.mcp_connections DROP CONSTRAINT IF EXISTS mcp_connections_user_id_provider_key;
DROP INDEX IF EXISTS mcp_connections_user_id_provider_key;
CREATE UNIQUE INDEX IF NOT EXISTS mcp_connections_user_ws_provider_uniq
  ON public.mcp_connections (user_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), provider);

-- Refresh RLS: user can access rows only for workspaces where they are an active member,
-- or legacy rows with workspace_id NULL (kept for DeePersona backward-compat).
DROP POLICY IF EXISTS "own mcp connections select" ON public.mcp_connections;
DROP POLICY IF EXISTS "own mcp connections modify" ON public.mcp_connections;

CREATE POLICY "mcp_conn_select" ON public.mcp_connections
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_org_member(auth.uid(), workspace_id))
  );

CREATE POLICY "mcp_conn_modify" ON public.mcp_connections
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_org_member(auth.uid(), workspace_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR public.is_org_member(auth.uid(), workspace_id))
  );

-- mcp_oauth_states: workspace + expiration
ALTER TABLE public.mcp_oauth_states
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes');

CREATE INDEX IF NOT EXISTS mcp_oauth_states_expires_at_idx
  ON public.mcp_oauth_states (expires_at);
