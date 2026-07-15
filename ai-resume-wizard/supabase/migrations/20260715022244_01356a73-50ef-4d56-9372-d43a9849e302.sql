
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS country text;

-- Full-text search over role + company (weighted role heavier).
ALTER TABLE public.job_listings
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(role, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(company, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS job_listings_search_vector_idx ON public.job_listings USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS job_listings_city_idx ON public.job_listings (lower(city));
CREATE INDEX IF NOT EXISTS job_listings_region_idx ON public.job_listings (upper(region));
CREATE INDEX IF NOT EXISTS job_listings_country_idx ON public.job_listings (upper(country));
CREATE INDEX IF NOT EXISTS job_listings_posted_at_idx ON public.job_listings (posted_at DESC NULLS LAST);

-- Best-effort backfill from the existing free-text `location` field for US rows.
DO $$
DECLARE
  us_states text[] := ARRAY['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
BEGIN
  -- "City, ST" or "City, ST, US"
  UPDATE public.job_listings
     SET city = trim(split_part(location, ',', 1)),
         region = upper(trim(split_part(location, ',', 2))),
         country = 'US'
   WHERE city IS NULL
     AND location IS NOT NULL
     AND array_length(string_to_array(location, ','), 1) >= 2
     AND upper(trim(split_part(location, ',', 2))) = ANY(us_states);
END $$;
