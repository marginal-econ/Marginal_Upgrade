-- Real diagram images cropped by a teacher from the actual past-paper page,
-- attached to a bank MCQ question during review. Separate from diagram_id
-- (which points at our own vector diagram library) — this is the literal
-- exam figure, used in preference to any library match when present.

ALTER TABLE public.bank_mcq_questions
  ADD COLUMN IF NOT EXISTS diagram_image_url TEXT;

-- Difficulty slider for AI-generated MCQ papers (standard/hard/extreme).
-- Stored on the attempt itself so every batch generated for the same paper
-- (generateMcqBatch is called repeatedly until the paper is full) stays at
-- the difficulty the student picked when they started it.
ALTER TABLE public.mcq_attempts
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'standard'
  CHECK (difficulty IN ('standard', 'hard', 'extreme'));

-- Bucket itself ("bank-diagrams") is created once in the Supabase dashboard
-- (Storage → New bucket → name it exactly "bank-diagrams"), same as the
-- existing "knowledge" bucket — these policies just govern who can read/
-- write objects in it once it exists.
CREATE POLICY "bank_diagrams_read_authenticated"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bank-diagrams');

CREATE POLICY "bank_diagrams_insert_staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bank-diagrams' AND public.is_staff(auth.uid()));

CREATE POLICY "bank_diagrams_update_staff"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bank-diagrams' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'bank-diagrams' AND public.is_staff(auth.uid()));

CREATE POLICY "bank_diagrams_delete_staff"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bank-diagrams' AND public.is_staff(auth.uid()));
