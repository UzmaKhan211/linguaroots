CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $function$;
UPDATE public.profiles p SET display_name = NULL, avatar_path = NULL, onboarded_at = NULL
FROM auth.users u WHERE u.id = p.id AND u.email IN ('judge1@linguaroots.com','judge2@linguaroots.com','judge3@linguaroots.com','judge-fresh@linguaroots.com');