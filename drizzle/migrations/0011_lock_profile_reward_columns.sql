REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
REVOKE INSERT, UPDATE ON public.profiles FROM anon;
GRANT INSERT (id, display_name, relative, age_confirmed, onboarded_at, avatar_path) ON public.profiles TO authenticated;
GRANT UPDATE (display_name, relative, age_confirmed, onboarded_at, avatar_path, updated_at) ON public.profiles TO authenticated;