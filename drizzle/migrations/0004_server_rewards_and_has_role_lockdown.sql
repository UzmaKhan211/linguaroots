REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, relative, age_confirmed, onboarded_at, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.award_xp(_kind text, _today date)
RETURNS TABLE (xp integer, streak integer, last_active_day date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _amount integer;
  _day date;
  _p public.profiles%ROWTYPE;
  _gap integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  _amount := CASE _kind WHEN 'warmup' THEN 20 WHEN 'line' THEN 10 WHEN 'scenario' THEN 50 ELSE NULL END;
  IF _amount IS NULL THEN RAISE EXCEPTION 'unknown reward'; END IF;
  _day := COALESCE(_today, current_date);
  IF _day < current_date - 1 OR _day > current_date + 1 THEN _day := current_date; END IF;
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
REVOKE ALL ON FUNCTION public.award_xp(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(text, date) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT _user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;