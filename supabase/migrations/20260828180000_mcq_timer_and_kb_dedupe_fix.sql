-- 1) MCQ timer, persisted server-side so pause/resume survives a reload,
--    a tab close, or opening the paper on a different device — and so the
--    timer can be turned off entirely for a given paper.
--
--    timer_enabled            — participant's choice at paper creation.
--    exam_ends_at             — absolute deadline while the clock is
--                                running; NULL while paused, not yet
--                                started, disabled, or after marking.
--    timer_paused_remaining_seconds
--                              — seconds left, frozen at the moment of
--                                pausing; NULL while running.
ALTER TABLE public.mcq_attempts
  ADD COLUMN IF NOT EXISTS timer_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS exam_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS timer_paused_remaining_seconds integer;

-- 2) Knowledge base duplicate detection was matching on content_hash alone,
--    with no regard for doc_type. That meant a real AS/A2 MCQ past paper
--    added under "MCQ calibration papers" would silently attach itself to
--    an existing document with the same text uploaded under a different
--    type (e.g. "Course materials") instead of being created as its own
--    mcq_calibration row — so the calibration tab stayed empty even though
--    the upload had "succeeded". A composite index makes the (content_hash,
--    doc_type) pair the thing application code should dedupe against; see
--    the matching change in knowledge.functions.ts.
CREATE INDEX IF NOT EXISTS kd_hash_doctype_idx
  ON public.knowledge_documents (content_hash, doc_type);
