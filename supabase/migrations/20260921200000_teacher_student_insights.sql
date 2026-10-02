-- A teacher may inspect learning activity only for a student currently enrolled
-- in a class that teacher owns. Admins retain their existing classroom access.
CREATE OR REPLACE FUNCTION public.get_teacher_student_insights(
  _classroom_id uuid,
  _student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.owns_classroom(_classroom_id) THEN
    RAISE EXCEPTION 'Teacher access to this class is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.classroom_members
    WHERE classroom_id = _classroom_id AND student_id = _student_id
  ) THEN
    RAISE EXCEPTION 'This student is not enrolled in the class.';
  END IF;

  SELECT jsonb_build_object(
    'student', jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'full_name', p.full_name,
      'school', p.school,
      'avatar_url', p.avatar_url,
      'last_seen', presence.last_seen
    ),
    'summary', jsonb_build_object(
      'essays_marked', (SELECT count(*) FROM public.essays e WHERE e.user_id = _student_id),
      'average_essay_percent', (SELECT round(avg(100.0 * e.latest_mark / nullif(e.max_mark, 0)), 1) FROM public.essays e WHERE e.user_id = _student_id AND e.latest_mark IS NOT NULL),
      'mcq_attempts', (SELECT count(*) FROM public.mcq_attempts m WHERE m.user_id = _student_id AND m.status = 'marked') + (SELECT count(*) FROM public.mcq_pdf_attempts m WHERE m.user_id = _student_id AND m.completed_at IS NOT NULL),
      'mcq_correct', coalesce((SELECT sum(m.score) FROM public.mcq_attempts m WHERE m.user_id = _student_id AND m.status = 'marked'), 0) + coalesce((SELECT sum(m.score) FROM public.mcq_pdf_attempts m WHERE m.user_id = _student_id AND m.completed_at IS NOT NULL), 0),
      'mcq_total', coalesce((SELECT sum(m.total) FROM public.mcq_attempts m WHERE m.user_id = _student_id AND m.status = 'marked'), 0) + coalesce((SELECT sum(m.total) FROM public.mcq_pdf_attempts m WHERE m.user_id = _student_id AND m.completed_at IS NOT NULL), 0),
      'generated_essays', (SELECT count(*) FROM public.ai_usage_log a WHERE a.user_id = _student_id AND a.feature = 'essay_generate' AND a.ok),
      'generated_questions', (SELECT count(*) FROM public.ai_usage_log a WHERE a.user_id = _student_id AND a.feature = 'essay_question_generate' AND a.ok),
      'live_examiner_sessions', (SELECT count(*) FROM public.live_examiner_sessions l WHERE l.user_id = _student_id),
      'ai_calls', (SELECT count(*) FROM public.ai_usage_log a WHERE a.user_id = _student_id AND a.ok)
    ),
    'essays', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'question', e.question, 'mark', e.latest_mark,
        'max_mark', e.max_mark, 'created_at', e.created_at,
        'ao1', v.ao1_awarded, 'ao2', v.ao2_awarded, 'ao3', v.ao3_awarded,
        'grading', v.grading
      ) ORDER BY e.created_at DESC)
      FROM (SELECT * FROM public.essays WHERE user_id = _student_id ORDER BY created_at DESC LIMIT 20) e
      LEFT JOIN LATERAL (
        SELECT ev.ao1_awarded, ev.ao2_awarded, ev.ao3_awarded, ev.grading
        FROM public.essay_versions ev WHERE ev.essay_id = e.id
        ORDER BY ev.version DESC LIMIT 1
      ) v ON true
    ), '[]'::jsonb),
    'mcq_attempts', coalesce((
      SELECT jsonb_agg(x.item ORDER BY x.sort_at DESC) FROM (
        SELECT jsonb_build_object('id', m.id, 'kind', 'Question bank', 'title', m.title,
          'topic', m.topic, 'score', m.score, 'total', m.total,
          'wrong', greatest(m.total - coalesce(m.score, 0), 0), 'completed_at', m.completed_at) item,
          coalesce(m.completed_at, m.created_at) sort_at
        FROM public.mcq_attempts m WHERE m.user_id = _student_id AND m.status = 'marked'
        UNION ALL
        SELECT jsonb_build_object('id', m.id, 'kind', 'Past paper', 'title', m.title,
          'topic', null, 'score', m.score, 'total', m.total,
          'wrong', greatest(m.total - coalesce(m.score, 0), 0), 'completed_at', m.completed_at) item,
          coalesce(m.completed_at, m.created_at) sort_at
        FROM public.mcq_pdf_attempts m WHERE m.user_id = _student_id AND m.completed_at IS NOT NULL
        ORDER BY sort_at DESC LIMIT 20
      ) x
    ), '[]'::jsonb),
    'topics', coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.accuracy_pct ASC NULLS FIRST) FROM public.mcq_topic_performance t WHERE t.user_id = _student_id), '[]'::jsonb),
    'live_sessions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', l.id, 'question', l.question, 'topic', l.topic,
        'level', l.level, 'words', array_length(regexp_split_to_array(trim(l.essay_text), '\\s+'), 1),
        'issues', jsonb_array_length(l.issues_history), 'updated_at', l.updated_at) ORDER BY l.updated_at DESC)
      FROM (SELECT * FROM public.live_examiner_sessions WHERE user_id = _student_id ORDER BY updated_at DESC LIMIT 10) l
    ), '[]'::jsonb)
  ) INTO result
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_presence presence ON presence.user_id = u.id
  WHERE u.id = _student_id;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_student_insights(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_student_insights(uuid, uuid) TO authenticated;
