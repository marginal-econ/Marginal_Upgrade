-- Live Examiner: let a student attach a diagram (photo, or a pick from the
-- diagram library) and have it persist across autosave/resume, the same way
-- the essay text itself already does.
ALTER TABLE public.live_examiner_sessions
  ADD COLUMN IF NOT EXISTS diagram_tag text;

-- Real past-paper library (MCQ Live): separate papers by exam year and
-- series so students can browse "May/June 2023", "Oct/Nov 2022", etc.
-- instead of one flat title-only list. Nullable so rows uploaded before
-- this migration don't break — the admin UI requires both fields for any
-- new upload from here on.
ALTER TABLE public.mcq_pdf_papers
  ADD COLUMN IF NOT EXISTS exam_year integer,
  ADD COLUMN IF NOT EXISTS exam_series text
    CHECK (exam_series IS NULL OR exam_series IN ('Feb/March', 'May/June', 'Oct/Nov'));

CREATE INDEX IF NOT EXISTS mcq_pdf_papers_year_series_idx
  ON public.mcq_pdf_papers (exam_year DESC, exam_series);
