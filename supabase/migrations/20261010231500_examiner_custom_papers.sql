-- ============================================================================
-- EXAMINER CUSTOM PAPERS: QUESTION PAPER (QP) & MARK SCHEME (MS) REPOSITORY
-- Allows teachers to upload full exam papers (QP & MS PDFs) for marking sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.examiner_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) >= 3),
  subject_code TEXT NOT NULL DEFAULT '9708' CHECK (subject_code IN ('9708', '9609', '9084')),
  subject_title TEXT NOT NULL DEFAULT 'Cambridge International AS & A Level Economics',
  qualification_level TEXT NOT NULL CHECK (qualification_level IN ('as', 'a2')),
  paper_number TEXT NOT NULL, -- e.g. '22', '42', '21', '12'
  exam_series TEXT NOT NULL, -- e.g. '2024_may_june', '2024_oct_nov', '2025_mock'
  total_marks INT NOT NULL DEFAULT 60 CHECK (total_marks > 0),
  duration_minutes INT NOT NULL DEFAULT 120 CHECK (duration_minutes > 0),
  qp_url TEXT,
  ms_url TEXT,
  qp_raw_text TEXT,
  ms_raw_text TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_official BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS examiner_papers_school_idx ON public.examiner_papers (school_id);
CREATE INDEX IF NOT EXISTS examiner_papers_level_idx ON public.examiner_papers (qualification_level);
CREATE INDEX IF NOT EXISTS examiner_papers_series_idx ON public.examiner_papers (exam_series);

-- Add optional paper_id and URLs to examiner_marking_sessions
ALTER TABLE public.examiner_marking_sessions 
  ADD COLUMN IF NOT EXISTS paper_id UUID REFERENCES public.examiner_papers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qp_url TEXT,
  ADD COLUMN IF NOT EXISTS ms_url TEXT;

GRANT ALL ON public.examiner_papers TO authenticated, service_role;
ALTER TABLE public.examiner_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS examiner_papers_authenticated_policy ON public.examiner_papers;
CREATE POLICY examiner_papers_authenticated_policy ON public.examiner_papers 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);
