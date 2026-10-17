CREATE TABLE public.reward_grants (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  ref text NOT NULL,
  day date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, ref)
);
GRANT ALL ON public.reward_grants TO service_role;
ALTER TABLE public.reward_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.award_xp(_kind text, _ref text, _today date)
RETURNS TABLE (xp integer, streak integer, last_active_day date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount integer;
  _day date;
  _p public.profiles%ROWTYPE;
  _gap integer;
  _key text;
  _inserted integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  _amount := CASE _kind WHEN 'warmup' THEN 20 WHEN 'line' THEN 10 WHEN 'scenario' THEN 50 ELSE NULL END;
  IF _amount IS NULL THEN RAISE EXCEPTION 'unknown reward'; END IF;
  IF _ref IS NULL OR length(_ref) = 0 OR length(_ref) > 120 THEN RAISE EXCEPTION 'bad reference'; END IF;
  _day := COALESCE(_today, current_date);
  IF _day < current_date - 1 OR _day > current_date + 1 THEN _day := current_date; END IF;
  -- Lessons pay once ever; each line pays once per day, capped at 30 lines a day.
  _key := CASE WHEN _kind = 'line' THEN _ref || '@' || _day::text ELSE _ref END;
  IF _kind = 'line' AND (SELECT count(*) FROM public.reward_grants g WHERE g.user_id = _uid AND g.kind = 'line' AND g.day = _day) >= 30 THEN
    _amount := 0;
  ELSE
    INSERT INTO public.reward_grants(user_id, kind, ref, day) VALUES (_uid, _kind, _key, _day) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS _inserted = ROW_COUNT;
    IF _inserted = 0 THEN _amount := 0; END IF;
  END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no profile'; END IF;
  IF _p.last_active_day IS NULL THEN _p.streak := 1; _p.last_active_day := _day;
  ELSE
    _gap := _day - _p.last_active_day;
    IF _gap <= 0 THEN _p.streak := GREATEST(1, _p.streak);
    ELSIF _gap = 1 THEN _p.streak := _p.streak + 1; _p.last_active_day := _day;
    ELSE _p.streak := 1; _p.last_active_day := _day;
    END IF;
  END IF;
  UPDATE public.profiles p SET xp = p.xp + _amount, streak = _p.streak, last_active_day = _p.last_active_day, updated_at = now()
    WHERE p.id = _uid RETURNING p.xp, p.streak, p.last_active_day INTO xp, streak, last_active_day;
  RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.award_xp(text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(text, text, date) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.award_xp(text, date) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.award_xp(text, date) IS 'DEPRECATED: replaced by award_xp(text, text, date)';