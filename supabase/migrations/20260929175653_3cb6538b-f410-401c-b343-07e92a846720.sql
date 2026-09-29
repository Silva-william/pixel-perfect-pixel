CREATE TABLE public.generated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_content TO authenticated;
GRANT ALL ON public.generated_content TO service_role;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own generated" ON public.generated_content FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER generated_updated BEFORE UPDATE ON public.generated_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tutor_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_threads TO authenticated;
GRANT ALL ON public.tutor_threads TO service_role;
ALTER TABLE public.tutor_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own threads" ON public.tutor_threads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER threads_updated BEFORE UPDATE ON public.tutor_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tutor_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.tutor_threads(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, message_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_messages TO authenticated;
GRANT ALL ON public.tutor_messages TO service_role;
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.tutor_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.tutor_messages(thread_id, created_at);