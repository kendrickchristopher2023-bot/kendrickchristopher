-- These tables have SELECT-only policies for signed-in users; the write
-- grants are unused and are revoked as defense in depth. service_role
-- still has full access for the server-side refresh + changelog writers.
REVOKE INSERT, UPDATE, DELETE ON public.changelog FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.refresh_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;