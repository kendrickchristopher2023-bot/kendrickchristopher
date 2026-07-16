
-- 1. Private table holding the shared cron/webhook secret.
CREATE TABLE IF NOT EXISTS public.cron_secret (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.cron_secret (id) VALUES (true)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.cron_secret ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated cannot read. service_role bypasses RLS.
REVOKE ALL ON public.cron_secret FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.cron_secret TO service_role;

-- 2. Rewire dispatch_refresh_slices: send the new header and drop the anon key.
--    Also remove public EXECUTE so anon/authenticated can't invoke it.
CREATE OR REPLACE FUNCTION public.dispatch_refresh_slices()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_url text := 'https://project--b49a53a4-bc7f-4d23-aaab-edf822850b4d.lovable.app/api/public/hooks/refresh-jobs';
  secret text;
  slice text;
  slices text[] := ARRAY[
    'remotive','remoteok','jobicy','arbeitnow','themuse','watched',
    'usajobs:charlotte','usajobs:raleigh','usajobs:durham',
    'usajobs:greensboro','usajobs:winston-salem',
    'usajobs:atlanta','usajobs:savannah',
    'usajobs:charleston-sc','usajobs:columbia-sc','usajobs:greenville-sc',
    'usajobs:jacksonville','usajobs:orlando','usajobs:tampa','usajobs:miami',
    'usajobs:richmond','usajobs:virginia-beach',
    'usajobs:knoxville','usajobs:nashville','usajobs:memphis',
    'usajobs:birmingham','usajobs:huntsville','usajobs:louisville'
  ];
  request_ids bigint[] := ARRAY[]::bigint[];
  rid bigint;
BEGIN
  SELECT token INTO secret FROM public.cron_secret WHERE id = true;
  FOREACH slice IN ARRAY slices LOOP
    SELECT net.http_post(
      url := base_url || '?slice=' || slice,
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', secret),
      body := '{}'::jsonb
    ) INTO rid;
    request_ids := array_append(request_ids, rid);
  END LOOP;
  RETURN jsonb_build_object('dispatched', slices, 'request_ids', request_ids);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dispatch_refresh_slices() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_refresh_slices() TO service_role;

-- 3. Reschedule the four cron jobs with the new header baked in.
DO $$
DECLARE
  secret text;
BEGIN
  SELECT token INTO secret FROM public.cron_secret WHERE id = true;

  PERFORM cron.unschedule('refresh-job-pool-daily');
  PERFORM cron.schedule(
    'refresh-job-pool-daily',
    '0 6 * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--b49a53a4-bc7f-4d23-aaab-edf822850b4d.lovable.app/api/public/hooks/refresh-jobs',
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, jsonb_build_object('Content-Type','application/json','x-cron-secret', secret)::text)
  );

  PERFORM cron.unschedule('rank-jobs-weekly');
  PERFORM cron.schedule(
    'rank-jobs-weekly',
    '0 7 * * 1',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--b49a53a4-bc7f-4d23-aaab-edf822850b4d.lovable.app/api/public/hooks/rank-jobs',
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, jsonb_build_object('Content-Type','application/json','x-cron-secret', secret)::text)
  );

  PERFORM cron.unschedule('weekly-digest-monday');
  PERFORM cron.schedule(
    'weekly-digest-monday',
    '30 7 * * 1',
    format($cmd$
      SELECT net.http_post(
        url := 'https://excel-ai-resume.lovable.app/api/public/hooks/weekly-digest',
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, jsonb_build_object('Content-Type','application/json','x-cron-secret', secret)::text)
  );

  PERFORM cron.unschedule('cleanup-weekly');
  PERFORM cron.schedule(
    'cleanup-weekly',
    '0 3 * * 0',
    format($cmd$
      SELECT net.http_post(
        url := 'https://excel-ai-resume.lovable.app/api/public/hooks/cleanup',
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cmd$, jsonb_build_object('Content-Type','application/json','x-cron-secret', secret)::text)
  );
END $$;
