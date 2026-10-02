-- Marginal MCQ Live: practice straight off an uploaded past paper (no AI
-- question generation involved — the paper is real, only the overlay
-- placement and topic tagging use AI). Mirrors mcq_attempts' shape closely
-- enough that mcq_topic_performance can union both sources into one
-- "where you're losing marks" feedback view.

CREATE TABLE public.mcq_pdf_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Past paper practice',
  filename text,
  level text NOT NULL DEFAULT 'as',
  -- One row per question: { number, topic, skill, correct_answer, user_answer, correct, locate_source }
  -- locate_source is "text" | "ai_vision" | "unplaced" — kept so we can see how much of a
  -- given paper needed the AI fallback vs the free coordinate heuristic.
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer,
  total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcq_pdf_attempts TO authenticated;
GRANT ALL ON public.mcq_pdf_attempts TO service_role;

ALTER TABLE public.mcq_pdf_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY mcq_pdf_own ON public.mcq_pdf_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY mcq_pdf_read_staff ON public.mcq_pdf_attempts FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER mcq_pdf_attempts_touch BEFORE UPDATE ON public.mcq_pdf_attempts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX mcq_pdf_attempts_user_created_idx ON public.mcq_pdf_attempts (user_id, created_at DESC);

-- Combined "which topics am I actually losing marks on" view, across both the
-- AI-generated paper flow (mcq_attempts, where correctness has to be derived
-- from questions[i].answer vs answers[i]) and the past-paper flow
-- (mcq_pdf_attempts, where each question already carries its own `correct`
-- boolean because grading happens against the uploaded mark scheme).
CREATE VIEW public.mcq_topic_performance AS
WITH generated AS (
  SELECT
    a.user_id,
    COALESCE(NULLIF(q ->> 'topic', ''), 'Untagged') AS topic,
    (q ->> 'answer' = (a.answers ->> (q ->> 'number')))::boolean AS correct
  FROM public.mcq_attempts a,
    LATERAL jsonb_array_elements(a.questions) AS q
  WHERE a.status = 'marked' AND a.answers ? (q ->> 'number')
),
past_paper AS (
  SELECT
    p.user_id,
    COALESCE(NULLIF(q ->> 'topic', ''), 'Untagged') AS topic,
    (q ->> 'correct')::boolean AS correct
  FROM public.mcq_pdf_attempts p,
    LATERAL jsonb_array_elements(p.questions) AS q
  WHERE p.completed_at IS NOT NULL AND (q ->> 'user_answer') IS NOT NULL
),
combined AS (
  SELECT * FROM generated
  UNION ALL
  SELECT * FROM past_paper
)
SELECT
  user_id,
  topic,
  count(*)::int AS attempted,
  count(*) FILTER (WHERE correct)::int AS correct_count,
  round(100.0 * count(*) FILTER (WHERE correct) / NULLIF(count(*), 0), 1) AS accuracy_pct
FROM combined
GROUP BY user_id, topic;

GRANT SELECT ON public.mcq_topic_performance TO authenticated;
