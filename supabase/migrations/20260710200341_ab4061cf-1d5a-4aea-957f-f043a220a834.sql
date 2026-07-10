CREATE TABLE IF NOT EXISTS public.mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  authorization_server text NOT NULL,
  resource text NOT NULL,
  client_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_type text NOT NULL DEFAULT 'Bearer',
  expires_at timestamptz,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_connections TO authenticated;
GRANT ALL ON public.mcp_connections TO service_role;

ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mcp connections select" ON public.mcp_connections
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own mcp connections modify" ON public.mcp_connections
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_mcp_connections_updated
  BEFORE UPDATE ON public.mcp_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.mcp_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  client_id text NOT NULL,
  code_verifier text NOT NULL,
  redirect_uri text NOT NULL,
  return_to text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.mcp_oauth_states TO service_role;

ALTER TABLE public.mcp_oauth_states ENABLE ROW LEVEL SECURITY;