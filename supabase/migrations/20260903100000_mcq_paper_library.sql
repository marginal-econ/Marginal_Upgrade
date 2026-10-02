-- MCQ Live becomes a shared library: a teacher/admin uploads past papers
-- once (single or bulk), students only ever pick one and practice — they
-- never upload a PDF themselves. Mirrors the bank_* "staff writes, RLS
-- enforces it, everyone reads" pattern already used for the question bank.

-- Bucket created public from the start (see 20260830090000's postmortem on
-- the bank-diagrams bucket — a private bucket breaks plain <img>/fetch
-- reads for logged-in students, and there's no confidentiality reason for
-- these to be gated; any enrolled student can already see the real paper).
INSERT INTO storage.buckets (id, name, public)
VALUES ('mcq-papers', 'mcq-papers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "mcq_papers_insert_staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mcq-papers' AND public.is_staff(auth.uid()));

CREATE POLICY "mcq_papers_update_staff"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'mcq-papers' AND public.is_staff(auth.uid()))
WITH CHECK (bucket_id = 'mcq-papers' AND public.is_staff(auth.uid()));

CREATE POLICY "mcq_papers_delete_staff"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'mcq-papers' AND public.is_staff(auth.uid()));

CREATE TABLE public.mcq_pdf_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  level text NOT NULL DEFAULT 'as' CHECK (level IN ('as', 'a2')),
  question_count integer NOT NULL DEFAULT 30,
  qp_path text NOT NULL,
  qp_url text NOT NULL,
  ms_path text,
  ms_url text,
  -- Parsed once at upload time by the teacher's browser (same
  -- Question/Answer/Marks table reader mcq-live.tsx always used) so a
  -- student practicing never has to fetch or re-parse the mark scheme —
  -- grading is instant off this cached key.
  answer_key jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mcq_pdf_papers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mcq_pdf_papers TO authenticated;
GRANT ALL ON public.mcq_pdf_papers TO service_role;

ALTER TABLE public.mcq_pdf_papers ENABLE ROW LEVEL SECURITY;

-- Every signed-in user (student, teacher, admin) can browse the library —
-- this is the read side students actually need.
CREATE POLICY mcq_papers_read_all ON public.mcq_pdf_papers FOR SELECT TO authenticated
  USING (true);

-- Only a teacher or admin can add, edit, or remove a paper. A student's
-- own insert/update/delete attempt is rejected here, not just hidden by
-- the UI — this is the actual "students can only practice" boundary.
CREATE POLICY mcq_papers_write_staff ON public.mcq_pdf_papers FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY mcq_papers_update_staff ON public.mcq_pdf_papers FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY mcq_papers_delete_staff ON public.mcq_pdf_papers FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE INDEX mcq_pdf_papers_created_idx ON public.mcq_pdf_papers (created_at DESC);

-- Link each attempt back to the library paper it came from, so a teacher
-- can eventually see per-paper stats too, not just per-topic. Nullable —
-- older rows (from before the library existed) simply have none.
ALTER TABLE public.mcq_pdf_attempts
  ADD COLUMN IF NOT EXISTS paper_id uuid REFERENCES public.mcq_pdf_papers(id) ON DELETE SET NULL;
