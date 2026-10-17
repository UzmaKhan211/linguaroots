DROP POLICY IF EXISTS "own progress insert" ON public.scenario_progress;
DROP POLICY IF EXISTS "own progress update" ON public.scenario_progress;
REVOKE INSERT, UPDATE ON public.scenario_progress FROM authenticated;

-- Lessons complete only in order: words, then phrases, then conversation.
CREATE OR REPLACE FUNCTION public.complete_lesson(_scenario text, _step text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r public.scenario_progress%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _scenario IS NULL OR length(_scenario) = 0 OR length(_scenario) > 80 THEN RAISE EXCEPTION 'bad scenario'; END IF;
  INSERT INTO public.scenario_progress(user_id, scenario_id) VALUES (_uid, _scenario) ON CONFLICT DO NOTHING;
  SELECT * INTO _r FROM public.scenario_progress WHERE user_id = _uid AND scenario_id = _scenario FOR UPDATE;
  IF _step = 'words' THEN
    UPDATE public.scenario_progress SET warmup_done = true, updated_at = now() WHERE user_id = _uid AND scenario_id = _scenario;
  ELSIF _step = 'phrases' THEN
    IF NOT _r.warmup_done THEN RAISE EXCEPTION 'words lesson not done'; END IF;
    UPDATE public.scenario_progress SET phrases_done = true, updated_at = now() WHERE user_id = _uid AND scenario_id = _scenario;
  ELSIF _step = 'conversation' THEN
    IF NOT (_r.warmup_done AND _r.phrases_done) THEN RAISE EXCEPTION 'earlier lessons not done'; END IF;
    UPDATE public.scenario_progress SET completed_count = completed_count + 1, resume = NULL, updated_at = now() WHERE user_id = _uid AND scenario_id = _scenario;
  ELSE RAISE EXCEPTION 'unknown step';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.save_resume(_scenario text, _resume jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _scenario IS NULL OR length(_scenario) = 0 OR length(_scenario) > 80 THEN RAISE EXCEPTION 'bad scenario'; END IF;
  IF _resume IS NOT NULL AND (jsonb_typeof(_resume) <> 'object' OR length(_resume::text) > 20000) THEN RAISE EXCEPTION 'bad resume'; END IF;
  INSERT INTO public.scenario_progress(user_id, scenario_id, resume) VALUES (_uid, _scenario, _resume)
  ON CONFLICT (user_id, scenario_id) DO UPDATE SET resume = EXCLUDED.resume, updated_at = now();
END $$;

REVOKE ALL ON FUNCTION public.complete_lesson(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_resume(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_lesson(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_resume(text, jsonb) TO authenticated;