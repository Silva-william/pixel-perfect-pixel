ALTER TABLE public.materials ADD COLUMN status text NOT NULL DEFAULT 'pending', ADD COLUMN current_page int NOT NULL DEFAULT 1;

CREATE TABLE public.material_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  page_number int NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, page_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_pages TO authenticated;
GRANT ALL ON public.material_pages TO service_role;
ALTER TABLE public.material_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own material pages" ON public.material_pages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);