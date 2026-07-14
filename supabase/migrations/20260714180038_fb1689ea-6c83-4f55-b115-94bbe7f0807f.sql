CREATE UNIQUE INDEX IF NOT EXISTS mcp_connections_user_ws_provider_key
  ON public.mcp_connections (user_id, workspace_id, provider)
  WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS mcp_connections_user_provider_key
  ON public.mcp_connections (user_id, provider)
  WHERE workspace_id IS NULL;