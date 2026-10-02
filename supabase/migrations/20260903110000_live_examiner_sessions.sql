-- Live Examiner: one autosaved writing session per (user, question), holding
-- the current draft text and the full suggestion history (accepted/dismissed
-- included) so a student can leave and resume without losing anything.
CREATE TABLE public.live_examiner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'as' CHECK (level IN ('as', 'a2')),
  topic text NOT NULL DEFAULT '',
  question text NOT NULL,
  max_mark integer NOT NULL DEFAULT 12,
  essay_text text NOT NULL DEFAULT '',
  -- Array of { id, category, severity, original, suggestion, explanation,
  -- context, status: 'active' | 'accepted' | 'dismissed', created_at }.
  -- Kept as one JSONB blob (not a child table) since it's always read and
  -- written as a whole with the draft — one row write per autosave, not N.
  issues_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_examiner_sessions TO authenticated;
GRANT ALL ON public.live_examiner_sessions TO service_role;

ALTER TABLE public.live_examiner_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_examiner_sessions_own ON public.live_examiner_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER live_examiner_sessions_touch
  BEFORE UPDATE ON public.live_examiner_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- One session per (user, question) — resuming the same question overwrites
-- the same draft rather than piling up duplicates every autosave tick.
CREATE UNIQUE INDEX live_examiner_sessions_user_question_idx
  ON public.live_examiner_sessions (user_id, question);

CREATE INDEX live_examiner_sessions_user_updated_idx
  ON public.live_examiner_sessions (user_id, updated_at DESC);
