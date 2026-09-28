CREATE OR REPLACE FUNCTION public.dispatch_refresh_slices()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_url text := 'https://project--b49a53a4-bc7f-4d23-aaab-edf822850b4d.lovable.app/api/public/hooks/refresh-jobs';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtaGVobm9pbXpjYWViY25zZ2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NzM0OTcsImV4cCI6MjA5OTM0OTQ5N30.JEOC9d3Vm2iNvjHC0W6WKU23BuO5Fb3i2z5haKMr_mU';
  slice text;
  -- usajobs is sub-sliced per metro so no single request has to cover the
  -- whole USAJOBS footprint (which was 502ing at the Worker timeout).
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
$function$;