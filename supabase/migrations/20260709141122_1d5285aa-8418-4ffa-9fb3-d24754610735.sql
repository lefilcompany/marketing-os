
-- DeePersona: enrich personas with ICP, Journey, Insights and lifecycle stage
ALTER TABLE public.personas
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS avatar_seed text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS icp jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journey jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS insights jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personas_stage_check') THEN
    ALTER TABLE public.personas
      ADD CONSTRAINT personas_stage_check
      CHECK (stage IN ('draft','base','icp','journey','insights','live'));
  END IF;
END $$;
