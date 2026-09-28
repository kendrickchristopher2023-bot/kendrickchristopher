
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Backfill from greatest available real-activity timestamp per user.
WITH activity AS (
  SELECT p.id,
    GREATEST(
      (SELECT max(GREATEST(r.updated_at, r.created_at)) FROM public.resumes r WHERE r.user_id = p.id),
      (SELECT max(created_at) FROM public.tailor_sessions ts WHERE ts.user_id = p.id),
      (SELECT max(created_at) FROM public.personal_matches pm WHERE pm.user_id = p.id),
      (SELECT max(GREATEST(a.updated_at, a.created_at)) FROM public.applications a WHERE a.user_id = p.id),
      (SELECT max(last_used_at) FROM public.api_tokens t WHERE t.user_id = p.id),
      p.updated_at,
      (SELECT last_sign_in_at FROM auth.users u WHERE u.id = p.id)
    ) AS best_ts
  FROM public.profiles p
)
UPDATE public.profiles p SET last_active_at = a.best_ts
FROM activity a WHERE a.id = p.id AND a.best_ts IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx ON public.profiles (last_active_at DESC NULLS LAST);
