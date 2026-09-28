
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;

DROP POLICY IF EXISTS "anyone can request access" ON public.access_requests;
CREATE POLICY "anyone can request access" ON public.access_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 254
    AND (reason IS NULL OR length(reason) <= 2000)
    AND (full_name IS NULL OR length(full_name) <= 200)
  );
