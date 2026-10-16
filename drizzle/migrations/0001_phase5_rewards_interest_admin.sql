ALTER TABLE public.profiles
  ADD COLUMN xp integer NOT NULL DEFAULT 0,
  ADD COLUMN streak integer NOT NULL DEFAULT 0,
  ADD COLUMN last_active_day date;

CREATE TABLE public.language_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_id text NOT NULL CHECK (char_length(language_id) BETWEEN 1 AND 40),
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.language_interest TO anon, authenticated;
GRANT SELECT ON public.language_interest TO authenticated;
GRANT ALL ON public.language_interest TO service_role;
ALTER TABLE public.language_interest ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "anyone can note interest" ON public.language_interest FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "admins read interest" ON public.language_interest FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "public read lesson audio" ON storage.objects FOR SELECT USING (bucket_id = 'lesson-audio');
CREATE POLICY "admins upload lesson audio" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update lesson audio" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete lesson audio" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-audio' AND public.has_role(auth.uid(), 'admin'));