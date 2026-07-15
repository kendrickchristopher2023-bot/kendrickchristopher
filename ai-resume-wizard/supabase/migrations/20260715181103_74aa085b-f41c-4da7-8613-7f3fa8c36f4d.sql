-- Lock down profile self-updates: revoke UPDATE on all columns, then re-grant
-- only the three columns the client legitimately writes. Also revoke INSERT/DELETE
-- and anon UPDATE/INSERT/DELETE, since profile lifecycle is server-side.
-- All privileged writes (plan, free_resume_rewrite_used, onboarded_at, etc.) go
-- through supabaseAdmin server-side.

REVOKE UPDATE, INSERT, DELETE ON public.profiles FROM authenticated;
REVOKE UPDATE, INSERT, DELETE ON public.profiles FROM anon;

GRANT UPDATE (full_name, email_notifications, screener_answers) ON public.profiles TO authenticated;

-- user_roles: users must never self-write. Reads are needed so the client can
-- check the current user's admin badge; all writes are admin-only via supabaseAdmin.
REVOKE UPDATE, INSERT, DELETE ON public.user_roles FROM authenticated;
REVOKE UPDATE, INSERT, DELETE ON public.user_roles FROM anon;
