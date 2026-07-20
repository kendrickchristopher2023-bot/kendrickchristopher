-- Lock down cron_secret: revoke all API-role grants and add explicit restrictive deny policy.
-- Only service_role (via SECURITY DEFINER functions like dispatch_refresh_slices) may access it.
REVOKE ALL ON public.cron_secret FROM anon, authenticated, PUBLIC;
ALTER TABLE public.cron_secret FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all access to cron_secret" ON public.cron_secret;
CREATE POLICY "Deny all access to cron_secret"
  ON public.cron_secret
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);