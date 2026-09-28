-- Switch increment_usage to SECURITY INVOKER and add owner-scoped write
-- policies on usage_daily so RLS enforces per-user scoping instead of the
-- function running with elevated privileges.

ALTER FUNCTION public.increment_usage(text) SECURITY INVOKER;

-- Restrict who can call it: signed-in users only (no anon/public).
REVOKE ALL ON FUNCTION public.increment_usage(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_usage(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_usage(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(text) TO service_role;

-- Owner-scoped write policies on usage_daily (SELECT own already exists).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.usage_daily'::regclass
      AND polname = 'own usage insert'
  ) THEN
    CREATE POLICY "own usage insert" ON public.usage_daily
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.usage_daily'::regclass
      AND polname = 'own usage update'
  ) THEN
    CREATE POLICY "own usage update" ON public.usage_daily
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;