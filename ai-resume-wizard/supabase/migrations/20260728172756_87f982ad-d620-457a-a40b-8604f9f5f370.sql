
ALTER TABLE public.watched_companies
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_healed_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_heal_from text,
  ADD COLUMN IF NOT EXISTS suggestions jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_watched_companies_active ON public.watched_companies(active) WHERE active = true;
