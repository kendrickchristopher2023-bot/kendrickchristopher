ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'free'::plan_tier;

ALTER TABLE public.tailor_sessions ADD COLUMN IF NOT EXISTS input_hash text;
CREATE INDEX IF NOT EXISTS tailor_sessions_user_hash_idx ON public.tailor_sessions (user_id, input_hash) WHERE input_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.effective_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.plan::text = 'founder' THEN 'founder'
    WHEN p.plan::text = 'pro'
      AND (p.plan_expires_at IS NULL OR p.plan_expires_at > now()) THEN 'pro'
    ELSE 'free'
  END
  FROM public.profiles p
  WHERE p.id = _user_id
$$;

GRANT EXECUTE ON FUNCTION public.effective_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_plan(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_usage(_action text)
 RETURNS TABLE(allowed boolean, used integer, cap integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  col text;
  cur int;
  _plan text;
  _cap int;
  _month_start date := date_trunc('month', current_date)::date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  col := CASE _action
    WHEN 'tailor'          THEN 'tailor_count'
    WHEN 'cover_letter'    THEN 'cover_letter_count'
    WHEN 'interview_prep'  THEN 'interview_prep_count'
    WHEN 'linkedin'        THEN 'linkedin_count'
    WHEN 'referral_dm'     THEN 'referral_dm_count'
    WHEN 'parse_resume'    THEN 'parse_resume_count'
    WHEN 'chat'            THEN 'chat_count'
    ELSE NULL
  END;
  IF col IS NULL THEN RAISE EXCEPTION 'unknown usage action %', _action; END IF;

  -- Single source of truth for the effective plan (handles expired pro passes).
  SELECT public.effective_plan(uid) INTO _plan;
  IF _plan IS NULL OR _plan NOT IN ('free','pro','founder') THEN
    _plan := 'free';
  END IF;

  -- FREE = monthly allowance (calendar month). PRO/FOUNDER = daily abuse guard.
  _cap := CASE _plan
    WHEN 'free' THEN
      CASE _action
        WHEN 'tailor' THEN 3
        WHEN 'cover_letter' THEN 2
        WHEN 'interview_prep' THEN 2
        WHEN 'linkedin' THEN 2
        WHEN 'referral_dm' THEN 2
        WHEN 'parse_resume' THEN 3
        WHEN 'chat' THEN 15
      END
    ELSE
      CASE _action
        WHEN 'tailor' THEN 200
        WHEN 'cover_letter' THEN 200
        WHEN 'interview_prep' THEN 200
        WHEN 'linkedin' THEN 200
        WHEN 'referral_dm' THEN 200
        WHEN 'parse_resume' THEN 50
        WHEN 'chat' THEN 300
      END
  END;

  INSERT INTO public.usage_daily(user_id, day) VALUES (uid, current_date)
    ON CONFLICT (user_id, day) DO NOTHING;

  IF _plan = 'free' THEN
    EXECUTE format(
      'SELECT COALESCE(SUM(%I),0)::int FROM public.usage_daily WHERE user_id=$1 AND day >= $2',
      col
    ) INTO cur USING uid, _month_start;

    IF cur >= _cap THEN
      RETURN QUERY SELECT false, cur, _cap;
      RETURN;
    END IF;

    EXECUTE format(
      'UPDATE public.usage_daily SET %I = %I + 1 WHERE user_id=$1 AND day=current_date',
      col, col
    ) USING uid;

    EXECUTE format(
      'SELECT COALESCE(SUM(%I),0)::int FROM public.usage_daily WHERE user_id=$1 AND day >= $2',
      col
    ) INTO cur USING uid, _month_start;

    RETURN QUERY SELECT true, cur, _cap;
    RETURN;
  END IF;

  EXECUTE format('SELECT %I FROM public.usage_daily WHERE user_id=$1 AND day=current_date', col)
    INTO cur USING uid;

  IF cur >= _cap THEN
    RETURN QUERY SELECT false, cur, _cap;
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE public.usage_daily SET %I = %I + 1 WHERE user_id=$1 AND day=current_date RETURNING %I',
    col, col, col
  ) INTO cur USING uid;

  RETURN QUERY SELECT true, cur, _cap;
END $function$;