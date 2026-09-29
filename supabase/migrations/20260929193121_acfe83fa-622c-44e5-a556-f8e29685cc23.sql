ALTER TABLE public.materials
  ADD COLUMN audio_page int,
  ADD COLUMN audio_chunk int NOT NULL DEFAULT 0,
  ADD COLUMN audio_seconds real NOT NULL DEFAULT 0,
  ADD COLUMN audio_updated_at timestamptz;

CREATE TABLE public.study_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  kind text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.study_activity TO authenticated;
GRANT ALL ON public.study_activity TO service_role;
ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.study_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.study_activity(user_id, created_at DESC);