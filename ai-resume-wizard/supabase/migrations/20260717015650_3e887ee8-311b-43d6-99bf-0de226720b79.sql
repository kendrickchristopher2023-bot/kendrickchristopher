CREATE TABLE IF NOT EXISTS public.refresh_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slice TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN,
  jobs_upserted INTEGER NOT NULL DEFAULT 0,
  companies_ok INTEGER NOT NULL DEFAULT 0,
  companies_failed INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  ms INTEGER
);

CREATE INDEX IF NOT EXISTS refresh_runs_slice_finished_idx
  ON public.refresh_runs (slice, finished_at DESC);
CREATE INDEX IF NOT EXISTS refresh_runs_started_idx
  ON public.refresh_runs (started_at DESC);

GRANT SELECT ON public.refresh_runs TO authenticated;
GRANT ALL ON public.refresh_runs TO service_role;

ALTER TABLE public.refresh_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read refresh_runs"
  ON public.refresh_runs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

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
      body := '{}'::jsonb,
      timeout_milliseconds := 90000
    ) INTO rid;
    request_ids := array_append(request_ids, rid);
  END LOOP;
  RETURN jsonb_build_object('dispatched', slices, 'request_ids', request_ids);
END;
$function$;