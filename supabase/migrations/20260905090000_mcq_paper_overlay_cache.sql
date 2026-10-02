-- MCQ Live: move the answer-button placement pass (text-layer heuristic +
-- AI vision fallback) from "every student, every attempt" to "once, when a
-- teacher adds or fixes a paper". Students then just fetch this cached
-- result and start answering immediately.
--
-- No RLS change needed: mcq_papers_read_all already lets any signed-in
-- user SELECT the whole row (so students can read the cached overlay),
-- and mcq_papers_write_staff / mcq_papers_update_staff already restrict
-- INSERT/UPDATE to teachers and admins (so only staff can compute or fix
-- one) — both policies already exist from 20260903100000.
ALTER TABLE public.mcq_pdf_papers
  ADD COLUMN IF NOT EXISTS overlay jsonb;

COMMENT ON COLUMN public.mcq_pdf_papers.overlay IS
  'Cached answer-button placement (per page: badges, pills, stem text for topic tagging), computed once client-side by the teacher who added/fixed the paper. Null means it has not been computed yet — MCQ Live should tell a student to ask a teacher to open it in the library first.';
