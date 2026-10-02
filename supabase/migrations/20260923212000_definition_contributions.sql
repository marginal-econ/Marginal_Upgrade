-- Moderated Definitions Hub contributions.
-- Students may submit extracted definitions for review; only staff publish.

ALTER TABLE public.definitions
  ALTER COLUMN source_document_id DROP NOT NULL,
  ALTER COLUMN source_chunk_id DROP NOT NULL;

ALTER TABLE public.definitions
  ADD COLUMN IF NOT EXISTS source_label TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE public.definition_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL CHECK (length(trim(term)) BETWEEN 1 AND 200),
  definition_text TEXT NOT NULL CHECK (length(trim(definition_text)) BETWEEN 3 AND 4000),
  source_title TEXT NOT NULL CHECK (length(trim(source_title)) BETWEEN 1 AND 240),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.definition_submissions TO authenticated;
GRANT ALL ON public.definition_submissions TO service_role;
ALTER TABLE public.definition_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "definition_submissions_insert_own" ON public.definition_submissions
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid() AND status = 'pending');
CREATE POLICY "definition_submissions_read_own_or_staff" ON public.definition_submissions
  FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "definition_submissions_staff_update" ON public.definition_submissions
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "definition_submissions_staff_delete" ON public.definition_submissions
  FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE INDEX definition_submissions_status_idx
  ON public.definition_submissions(status, created_at DESC);
CREATE INDEX definition_submissions_submitter_idx
  ON public.definition_submissions(submitted_by, created_at DESC);
CREATE TRIGGER definition_submissions_touch BEFORE UPDATE ON public.definition_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

