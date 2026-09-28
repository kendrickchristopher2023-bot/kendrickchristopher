-- 1) job_listings.source_slug: nullable text, index for join lookups.
ALTER TABLE public.job_listings ADD COLUMN IF NOT EXISTS source_slug text;
CREATE INDEX IF NOT EXISTS job_listings_source_source_slug_idx
  ON public.job_listings (source, source_slug)
  WHERE source_slug IS NOT NULL;

-- Backfill: greenhouse/lever/ashby all use `${slug}:${id}` as source_id.
-- Aggregate feeds (remotive/remoteok/jobicy/arbeitnow/themuse) get no slug.
UPDATE public.job_listings
SET source_slug = split_part(source_id, ':', 1)
WHERE source IN ('greenhouse','lever','ashby')
  AND source_slug IS NULL
  AND position(':' in source_id) > 0;

-- 2) watched_companies -> per-user.
-- Assign all existing (null-owner) rows to the founder account.
UPDATE public.watched_companies
SET added_by = '37d308dc-56ad-4597-a3d7-b24847c466d4'
WHERE added_by IS NULL;

-- Make added_by required and cascade on user delete.
ALTER TABLE public.watched_companies
  ALTER COLUMN added_by SET NOT NULL;

ALTER TABLE public.watched_companies
  DROP CONSTRAINT IF EXISTS watched_companies_added_by_fkey;
ALTER TABLE public.watched_companies
  ADD CONSTRAINT watched_companies_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Uniqueness is now per-user: two users can independently watch the same company.
ALTER TABLE public.watched_companies
  DROP CONSTRAINT IF EXISTS watched_companies_source_slug_key;
ALTER TABLE public.watched_companies
  ADD CONSTRAINT watched_companies_user_source_slug_key
  UNIQUE (added_by, source, slug);

CREATE INDEX IF NOT EXISTS watched_companies_added_by_idx
  ON public.watched_companies (added_by);

-- Tighten SELECT policy: users only see their own rows.
DROP POLICY IF EXISTS "Authenticated users can read watched companies" ON public.watched_companies;
CREATE POLICY "Users can read only their own watched companies"
  ON public.watched_companies FOR SELECT
  TO authenticated
  USING (added_by = auth.uid());

-- 3) profiles.enabled_feeds: user's aggregate-feed preferences.
-- NULL means "all defaults on" (interpreted server-side).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS enabled_feeds text[];

-- Column-level UPDATE grant so a user can toggle their own feed prefs
-- (matches the earlier column-grants lockdown; only whitelisted columns are writable).
GRANT UPDATE (enabled_feeds) ON public.profiles TO authenticated;
