ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
-- server-side only: do NOT add is_demo to the authenticated UPDATE grant.
GRANT ALL ON public.profiles TO service_role;