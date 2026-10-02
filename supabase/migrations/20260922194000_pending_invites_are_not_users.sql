-- Invitation links create auth.users rows before recipients accept them.
-- Only accounts that have actually signed in consume a seat or appear in
-- administrator user activity.

CREATE OR REPLACE FUNCTION public.signup_decision(p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_users integer;
  v_free integer;
  v_ahead integer;
  v_created timestamptz;
BEGIN
  IF v_email = 'retired-admin@marginal.invalid' THEN
    RETURN 'allow';
  END IF;

  SELECT count(*) INTO v_users
  FROM auth.users
  WHERE lower(email) <> v_email
    AND last_sign_in_at IS NOT NULL;

  v_free := public.app_user_cap() - v_users;
  IF v_free <= 0 THEN
    RETURN 'waitlist';
  END IF;

  SELECT created_at INTO v_created
  FROM public.signup_waitlist
  WHERE lower(email) = v_email;

  IF v_created IS NOT NULL THEN
    SELECT count(*) INTO v_ahead
    FROM public.signup_waitlist
    WHERE created_at < v_created;
  ELSE
    SELECT count(*) INTO v_ahead FROM public.signup_waitlist;
  END IF;

  IF v_ahead < v_free THEN
    RETURN 'allow';
  END IF;
  RETURN 'waitlist';
END;
$$;

CREATE OR REPLACE FUNCTION public.public_signup_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_users integer;
  v_waiting integer;
BEGIN
  SELECT count(*) INTO v_users
  FROM auth.users
  WHERE last_sign_in_at IS NOT NULL;

  SELECT count(*) INTO v_waiting FROM public.signup_waitlist;
  RETURN jsonb_build_object(
    'waitlist_count', v_waiting,
    'is_full', greatest(public.app_user_cap() - v_users, 0) <= v_waiting,
    'essay_daily_limit', public.app_essay_daily_limit()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  RETURN jsonb_build_object(
    'max_users', public.app_user_cap(),
    'essay_daily_limit', public.app_essay_daily_limit(),
    'current_users', (SELECT count(*) FROM auth.users WHERE last_sign_in_at IS NOT NULL),
    'waitlist_count', (SELECT count(*) FROM public.signup_waitlist),
    'ai_enabled', public.app_ai_enabled(),
    'ai_mode', public.app_ai_mode()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_activity()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  school text,
  role text,
  joined_at timestamptz,
  last_seen timestamptz,
  current_path text,
  is_online boolean,
  essays_graded bigint,
  essays_today integer,
  live_examiner_sessions bigint,
  mcq_attempts bigint,
  ai_calls bigint,
  last_activity timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._require_admin();
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    p.school,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin') THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'teacher') THEN 'teacher'
      ELSE 'student'
    END,
    u.created_at,
    pr.last_seen,
    pr.path,
    COALESCE(pr.last_seen > now() - interval '150 seconds', false),
    COALESCE(ev.n, 0),
    COALESCE(dfu.uses, 0),
    COALESCE(ls.n, 0),
    COALESCE(m.n, 0) + COALESCE(mp.n, 0),
    COALESCE(ai.n, 0),
    greatest(pr.last_seen, ai.last_at, ev.last_at, ls.last_at)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.user_presence pr ON pr.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT count(*) AS n, max(created_at) AS last_at
    FROM public.essay_versions WHERE user_id = u.id
  ) ev ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n, max(updated_at) AS last_at
    FROM public.live_examiner_sessions WHERE user_id = u.id
  ) ls ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.mcq_attempts WHERE user_id = u.id
  ) m ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n FROM public.mcq_pdf_attempts WHERE user_id = u.id
  ) mp ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS n, max(created_at) AS last_at
    FROM public.ai_usage_log WHERE user_id = u.id
  ) ai ON true
  LEFT JOIN public.daily_feature_usage dfu
    ON dfu.user_id = u.id AND dfu.feature = 'essay_grade' AND dfu.usage_day = public.app_today()
  WHERE u.last_sign_in_at IS NOT NULL
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.signup_decision(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.signup_decision(text) TO service_role;
REVOKE ALL ON FUNCTION public.public_signup_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_signup_status() TO anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_user_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_activity() TO authenticated;
