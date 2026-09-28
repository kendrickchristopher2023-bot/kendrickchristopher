
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS salary_min numeric,
  ADD COLUMN IF NOT EXISTS salary_max numeric,
  ADD COLUMN IF NOT EXISTS salary_currency text,
  ADD COLUMN IF NOT EXISTS salary_period text,
  ADD COLUMN IF NOT EXISTS experience_level text;

CREATE INDEX IF NOT EXISTS job_listings_experience_level_idx
  ON public.job_listings(experience_level)
  WHERE experience_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_listings_salary_max_idx
  ON public.job_listings(salary_max)
  WHERE salary_max IS NOT NULL;
CREATE INDEX IF NOT EXISTS job_listings_salary_min_idx
  ON public.job_listings(salary_min)
  WHERE salary_min IS NOT NULL;
