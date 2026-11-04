-- Live Examiner v2: Persistent sentence cache, score history, and document versioning
-- Enables instant, zero-cost session reload and progress tracking sparklines.

ALTER TABLE public.live_examiner_sessions
  ADD COLUMN IF NOT EXISTS sentence_cache jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS score_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS doc_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 2;

-- Existing RLS policies (live_examiner_sessions_own) and triggers (touch_updated_at)
-- automatically cover these new additive columns.
