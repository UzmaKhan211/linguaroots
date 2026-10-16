CREATE TABLE public.closeness_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL,
  score integer NOT NULL,
  passed boolean NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  scorer text NOT NULL DEFAULT 'quick',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.closeness_attempts TO authenticated;
GRANT ALL ON public.closeness_attempts TO service_role;
ALTER TABLE public.closeness_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts insert" ON public.closeness_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read attempts" ON public.closeness_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));