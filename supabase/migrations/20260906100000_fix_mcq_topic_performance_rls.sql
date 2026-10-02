-- Fix: mcq_topic_performance was a plain view, so it ran as its OWNER
-- (postgres, which bypasses RLS) rather than the querying user. Since the
-- view itself has no WHERE user_id = auth.uid() filter, this meant ANY
-- authenticated user — not just staff — could query it directly and read
-- every other student's topic-by-topic accuracy, bypassing the "own rows
-- only" RLS policy on mcq_attempts/mcq_pdf_attempts entirely. This is the
-- same class of bug the classroom_roster view avoided by being created
-- with security_invoker = true in the first place.
--
-- Re-creating with security_invoker makes the view run as the calling
-- user: a student's query now only sees their own rows (matches the
-- "_own" policy on the underlying tables), and staff continue to see
-- every student's rows (matches "_read_staff"), which is the existing,
-- intentional, app-wide behaviour for teachers/admins elsewhere (e.g.
-- essays_read_staff) — nothing about staff visibility changes here, only
-- the student-to-student leak is closed.

DROP VIEW public.mcq_topic_performance;

CREATE VIEW public.mcq_topic_performance WITH (security_invoker = true) AS
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
