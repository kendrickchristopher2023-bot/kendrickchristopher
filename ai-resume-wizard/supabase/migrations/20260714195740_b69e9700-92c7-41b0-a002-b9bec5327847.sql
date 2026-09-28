
-- 1) Shared job listings pool
CREATE TABLE public.job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_id text NOT NULL,
  company text NOT NULL,
  role text NOT NULL,
  location text,
  url text NOT NULL,
  description text,
  remote boolean DEFAULT false,
  posted_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX idx_job_listings_fetched_at ON public.job_listings (fetched_at DESC);
CREATE INDEX idx_job_listings_company ON public.job_listings (company);
CREATE INDEX idx_job_listings_posted_at ON public.job_listings (posted_at DESC NULLS LAST);

GRANT SELECT ON public.job_listings TO authenticated;
GRANT ALL ON public.job_listings TO service_role;

ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read job listings"
  ON public.job_listings FOR SELECT
  TO authenticated
  USING (true);

-- 2) Watched companies (which ATS boards to fetch)
CREATE TABLE public.watched_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  slug text NOT NULL,
  company_name text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_fetched_at timestamptz,
  last_fetch_status text,
  last_fetch_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, slug)
);

CREATE INDEX idx_watched_companies_source ON public.watched_companies (source);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watched_companies TO authenticated;
GRANT ALL ON public.watched_companies TO service_role;

ALTER TABLE public.watched_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read watched companies"
  ON public.watched_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can add watched companies"
  ON public.watched_companies FOR INSERT
  TO authenticated
  WITH CHECK (added_by = auth.uid());

CREATE POLICY "Users can delete only their own additions"
  ON public.watched_companies FOR DELETE
  TO authenticated
  USING (added_by = auth.uid());

CREATE POLICY "Users can update only their own additions"
  ON public.watched_companies FOR UPDATE
  TO authenticated
  USING (added_by = auth.uid())
  WITH CHECK (added_by = auth.uid());

-- 3) Extend personal_matches with pipeline status + source + listing link
ALTER TABLE public.personal_matches
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'saved',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS job_listing_id uuid REFERENCES public.job_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_personal_matches_status ON public.personal_matches (user_id, status);
CREATE INDEX IF NOT EXISTS idx_personal_matches_source ON public.personal_matches (user_id, source);

-- 4) Seed well-known tech companies (system seeds have added_by = NULL, so RLS blocks user deletion)
INSERT INTO public.watched_companies (source, slug, company_name, added_by) VALUES
  -- Greenhouse
  ('greenhouse', 'airbnb', 'Airbnb', NULL),
  ('greenhouse', 'stripe', 'Stripe', NULL),
  ('greenhouse', 'anthropic', 'Anthropic', NULL),
  ('greenhouse', 'instacart', 'Instacart', NULL),
  ('greenhouse', 'discord', 'Discord', NULL),
  ('greenhouse', 'doordash', 'DoorDash', NULL),
  ('greenhouse', 'coinbase', 'Coinbase', NULL),
  ('greenhouse', 'robinhood', 'Robinhood', NULL),
  ('greenhouse', 'plaid', 'Plaid', NULL),
  ('greenhouse', 'reddit', 'Reddit', NULL),
  ('greenhouse', 'pinterest', 'Pinterest', NULL),
  ('greenhouse', 'roblox', 'Roblox', NULL),
  ('greenhouse', 'notion', 'Notion', NULL),
  ('greenhouse', 'databricks', 'Databricks', NULL),
  ('greenhouse', 'gitlab', 'GitLab', NULL),
  ('greenhouse', 'wealthfront', 'Wealthfront', NULL),
  ('greenhouse', 'benchling', 'Benchling', NULL),
  ('greenhouse', 'ramp', 'Ramp', NULL),
  ('greenhouse', 'brex', 'Brex', NULL),
  ('greenhouse', 'mercury', 'Mercury', NULL),
  ('greenhouse', 'openai', 'OpenAI', NULL),
  ('greenhouse', 'perplexityai', 'Perplexity AI', NULL),
  ('greenhouse', 'huggingface', 'Hugging Face', NULL),
  ('greenhouse', 'scaleai', 'Scale AI', NULL),
  ('greenhouse', 'retool', 'Retool', NULL),
  ('greenhouse', 'vercel', 'Vercel', NULL),
  ('greenhouse', 'linear', 'Linear', NULL),
  ('greenhouse', 'webflow', 'Webflow', NULL),
  ('greenhouse', 'zapier', 'Zapier', NULL),
  ('greenhouse', 'clickup', 'ClickUp', NULL),
  -- Lever
  ('lever', 'netflix', 'Netflix', NULL),
  ('lever', 'shopify', 'Shopify', NULL),
  ('lever', 'figma', 'Figma', NULL),
  ('lever', 'palantir', 'Palantir', NULL),
  ('lever', 'kickstarter', 'Kickstarter', NULL),
  ('lever', 'lyft', 'Lyft', NULL),
  ('lever', 'eventbrite', 'Eventbrite', NULL),
  ('lever', 'blend', 'Blend', NULL),
  ('lever', 'benchling', 'Benchling', NULL),
  ('lever', 'attentive', 'Attentive', NULL),
  -- Ashby (newer / YC-heavy)
  ('ashby', 'openai', 'OpenAI', NULL),
  ('ashby', 'ramp', 'Ramp', NULL),
  ('ashby', 'linear', 'Linear', NULL),
  ('ashby', 'posthog', 'PostHog', NULL),
  ('ashby', 'replit', 'Replit', NULL),
  ('ashby', 'supabase', 'Supabase', NULL),
  ('ashby', 'clay', 'Clay', NULL),
  ('ashby', 'vanta', 'Vanta', NULL),
  ('ashby', 'mercury', 'Mercury', NULL),
  ('ashby', 'perplexity', 'Perplexity', NULL),
  -- Remotive (aggregator: one fetch = all listings; slug='all' is a sentinel)
  ('remotive', 'all', 'Remotive (all remote jobs)', NULL);
