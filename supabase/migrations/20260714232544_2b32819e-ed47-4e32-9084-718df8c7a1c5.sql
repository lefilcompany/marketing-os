CREATE TABLE public.tool_brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id text NOT NULL,
  brand text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tool_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_brand_settings TO authenticated;
GRANT ALL ON public.tool_brand_settings TO service_role;

ALTER TABLE public.tool_brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tool brand settings"
  ON public.tool_brand_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_tool_brand_settings_updated_at
  BEFORE UPDATE ON public.tool_brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();