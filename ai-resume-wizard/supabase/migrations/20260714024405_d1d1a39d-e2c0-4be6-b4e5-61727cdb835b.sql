
-- Named resume tracks
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS name text;
CREATE UNIQUE INDEX IF NOT EXISTS resumes_one_primary_per_user
  ON public.resumes(user_id) WHERE is_primary;

-- Atomic usage-cap enforcement
CREATE OR REPLACE FUNCTION public.increment_usage(_action text, _cap int)
RETURNS TABLE(allowed boolean, used int, cap int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  col text;
  cur int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  col := CASE _action
    WHEN 'tailor'          THEN 'tailor_count'
    WHEN 'cover_letter'    THEN 'cover_letter_count'
    WHEN 'interview_prep'  THEN 'interview_prep_count'
    WHEN 'linkedin'        THEN 'linkedin_count'
    WHEN 'referral_dm'     THEN 'referral_dm_count'
    WHEN 'parse_resume'    THEN 'parse_resume_count'
    ELSE NULL
  END;
  IF col IS NULL THEN RAISE EXCEPTION 'unknown usage action %', _action; END IF;

  INSERT INTO public.usage_daily(user_id, day) VALUES (uid, current_date)
    ON CONFLICT (user_id, day) DO NOTHING;

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
END $$;

GRANT EXECUTE ON FUNCTION public.increment_usage(text, int) TO authenticated;
