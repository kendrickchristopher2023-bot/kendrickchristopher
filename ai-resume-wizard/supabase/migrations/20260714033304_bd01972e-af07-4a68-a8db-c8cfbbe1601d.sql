ALTER TABLE public.usage_daily
  ADD COLUMN IF NOT EXISTS chat_count INT NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.increment_usage(text);

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

  SELECT plan::text INTO _plan FROM public.profiles WHERE id = uid;
  IF _plan IS NULL OR _plan NOT IN ('free','pro','founder') THEN
    _plan := 'free';
  END IF;

  _cap := CASE _plan
    WHEN 'free' THEN
      CASE _action
        WHEN 'tailor' THEN 10
        WHEN 'cover_letter' THEN 10
        WHEN 'interview_prep' THEN 10
        WHEN 'linkedin' THEN 10
        WHEN 'referral_dm' THEN 10
        WHEN 'parse_resume' THEN 5
        WHEN 'chat' THEN 20
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

REVOKE ALL ON FUNCTION public.increment_usage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_usage(text) TO authenticated;