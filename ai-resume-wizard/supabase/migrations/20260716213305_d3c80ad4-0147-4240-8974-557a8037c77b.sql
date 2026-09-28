
-- Dispatches one net.http_post per refresh slice against the refresh-jobs
-- hook. Each request gets its own Worker request-timeout budget so one slow
-- source can never 502 the others. Called by the daily cron and by the admin
-- "Refresh now" button (via supabaseAdmin.rpc).

CREATE OR REPLACE FUNCTION public.dispatch_refresh_slices()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text := 'https://project--b49a53a4-bc7f-4d23-aaab-edf822850b4d.lovable.app/api/public/hooks/refresh-jobs';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtaGVobm9pbXpjYWViY25zZ2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzM0OTcsImV4cCI6MjA5OTM0OTQ5N30.JEOC9d3Vm2iNvjHC0W6WKU23BuO5Fb3i2z5haKMr_mU';
  slice text;
  slices text[] := ARRAY['remotive','remoteok','jobicy','arbeitnow','themuse','usajobs','watched'];
  request_ids bigint[] := ARRAY[]::bigint[];
  rid bigint;
BEGIN
  FOREACH slice IN ARRAY slices LOOP
    SELECT net.http_post(
      url := base_url || '?slice=' || slice,
      headers := jsonb_build_object('Content-Type','application/json','apikey', anon_key),
      body := '{}'::jsonb
    ) INTO rid;
    request_ids := array_append(request_ids, rid);
  END LOOP;
  RETURN jsonb_build_object('dispatched', slices, 'request_ids', request_ids);
END;
$$;

-- Only the service_role (used by the admin refresh flow) can call it directly.
-- pg_cron runs as the postgres superuser so it doesn't need a grant.
REVOKE ALL ON FUNCTION public.dispatch_refresh_slices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_refresh_slices() TO service_role;
