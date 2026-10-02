-- ============================================================================
-- User cap + waitlist, daily usage limits, live presence, admin analytics.
--
--   1. app_settings           — admin-editable numbers (max users, essays/day)
--   2. Signup cap             — DB-enforced in handle_new_user(); anyone over
--                               the cap goes on signup_waitlist instead
--   3. signup_waitlist        — first-come-first-served, admin-viewable,
--                               public COUNT only (never the emails)
--   4. daily_feature_usage    — hard per-day ledger (separate from the user's
--                               own data, so deleting essays/sessions can
--                               NOT reset a limit)
--        - essay grading      : admin-configurable per-day cap (default 5)
--        - Live Examiner      : exactly ONE session (one question) per day,
--                               fixed, not configurable
--        - the retired bootstrap admin address is exempt from both
--   5. user_presence          — heartbeat so the admin can see who is online
--   6. admin_* functions      — settings, waitlist, per-user activity
--
-- "A day" = midnight-to-midnight India Standard Time (Asia/Kolkata).
-- ============================================================================

-- ── 1. Settings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  int_value integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- No policies and no grants to anon/authenticated: only the SECURITY DEFINER
-- functions below (and the service role) can touch it.
GRANT ALL ON public.app_settings TO service_role;

INSERT INTO public.app_settings (key, int_value) VALUES
  ('max_users', 30),
  ('essay_daily_limit', 5)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_setting_int(p_key text, p_default integer)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT int_value FROM public.app_settings WHERE key = p_key), p_default);
$$;

CREATE OR REPLACE FUNCTION public.app_user_cap()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.app_setting_int('max_users', 30);
$$;

CREATE OR REPLACE FUNCTION public.app_essay_daily_limit()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.app_setting_int('essay_daily_limit', 5);
$$;

-- "Today" for every daily limit: India Standard Time (the school is in
-- Coimbatore). Change the zone here if you ever need a different day cut-off.
CREATE OR REPLACE FUNCTION public.app_today()
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date;
$$;

CREATE OR REPLACE FUNCTION public._require_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access is required for this action.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

-- ── 2/3. Waitlist ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signup_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS signup_waitlist_email_key
  ON public.signup_waitlist (lower(email));

ALTER TABLE public.signup_waitlist ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.signup_waitlist TO authenticated;
GRANT ALL ON public.signup_waitlist TO service_role;
DROP POLICY IF EXISTS signup_waitlist_admin_read ON public.signup_waitlist;
CREATE POLICY signup_waitlist_admin_read ON public.signup_waitlist
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- The single source of truth for "may this email create an account right
-- now?". Callers must already hold the signup advisory lock.
--
-- Seats are first-come-first-served: free seats are reserved for the people
-- at the front of the waitlist, so someone new can't jump the queue when the
-- admin raises the cap or deletes an account.
CREATE OR REPLACE FUNCTION public.signup_decision(p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_users integer;
  v_free integer;
  v_ahead integer;
  v_created timestamptz;
BEGIN
  -- The hardcoded admin can always get in.
  IF v_email = 'retired-admin@marginal.invalid' THEN
    RETURN 'allow';
  END IF;

  -- Everyone EXCEPT this email (the AFTER INSERT trigger already sees the
  -- new row, a pre-check doesn't — excluding it makes both agree).
  SELECT count(*) INTO v_users FROM auth.users WHERE lower(email) <> v_email;
  v_free := public.app_user_cap() - v_users;
  IF v_free <= 0 THEN
    RETURN 'waitlist';
  END IF;

  SELECT created_at INTO v_created FROM public.signup_waitlist WHERE lower(email) = v_email;
  IF v_created IS NOT NULL THEN
    SELECT count(*) INTO v_ahead FROM public.signup_waitlist WHERE created_at < v_created;
  ELSE
    SELECT count(*) INTO v_ahead FROM public.signup_waitlist;
  END IF;

  IF v_ahead < v_free THEN
    RETURN 'allow';
  END IF;
  RETURN 'waitlist';
END;
$$;

-- Same body as 20260829150000_fix_teacher_domain.sql, plus the capacity gate.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role public.app_role;
  wants_teacher boolean;
BEGIN
  wants_teacher := COALESCE((NEW.raw_user_meta_data ->> 'wants_teacher')::boolean, false);

  IF NEW.email ILIKE 'retired-admin@marginal.invalid' THEN
    assigned_role := 'admin';
  ELSE
    -- Serialise signups so two people can't both grab the last seat.
    PERFORM pg_advisory_xact_lock(hashtext('marginal_user_cap'));
    IF public.signup_decision(NEW.email) <> 'allow' THEN
      RAISE EXCEPTION 'SIGNUPS_FULL: Marginal is at capacity right now — you have been added to the waitlist instead.'
        USING ERRCODE = 'check_violation';
    END IF;

    IF wants_teacher AND NEW.email ILIKE '%@csacoimbatore.com' THEN
      assigned_role := 'teacher';
    ELSIF wants_teacher THEN
      RAISE EXCEPTION
        'Teacher accounts require a @csacoimbatore.com email. Sign up without teacher access to use this as a student.'
        USING ERRCODE = 'insufficient_privilege';
    ELSE
      assigned_role := 'student';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- They got in — drop them off the waitlist.
  DELETE FROM public.signup_waitlist WHERE lower(email) = lower(NEW.email);

  RETURN NEW;
END;
$$;

-- Public, called from the sign-up form BEFORE creating an account. Adds the
-- person to the waitlist only if there is genuinely no seat for them.
--   { status: 'open' }                    → go ahead and sign up normally
--   { status: 'waitlisted', position: n } → they are (already) in the queue
CREATE OR REPLACE FUNCTION public.join_waitlist(p_email text, p_full_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := nullif(left(btrim(coalesce(p_full_name, '')), 120), '');
  v_pos integer;
BEGIN
  IF length(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('marginal_user_cap'));

  -- Already registered, or a seat is available for them: normal sign-up.
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email)
     OR public.signup_decision(v_email) = 'allow' THEN
    RETURN jsonb_build_object('status', 'open');
  END IF;

  -- Basic guard against someone flooding the public form.
  IF (SELECT count(*) FROM public.signup_waitlist) >= 1000 THEN
    RAISE EXCEPTION 'The waitlist is full right now — please try again later.';
  END IF;

  INSERT INTO public.signup_waitlist (email, full_name)
  VALUES (v_email, v_name)
  ON CONFLICT ((lower(email))) DO NOTHING;

  SELECT count(*) INTO v_pos
  FROM public.signup_waitlist
  WHERE created_at <= (SELECT created_at FROM public.signup_waitlist WHERE lower(email) = v_email);

  RETURN jsonb_build_object('status', 'waitlisted', 'position', v_pos);
END;
$$;

-- Public, for the homepage footer. Counts only — never emails or user totals.
CREATE OR REPLACE FUNCTION public.public_signup_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_users integer;
  v_waiting integer;
BEGIN
  SELECT count(*) INTO v_users FROM auth.users;
  SELECT count(*) INTO v_waiting FROM public.signup_waitlist;
  RETURN jsonb_build_object(
    'waitlist_count', v_waiting,
    'is_full', greatest(public.app_user_cap() - v_users, 0) <= v_waiting,
    'essay_daily_limit', public.app_essay_daily_limit()
  );
END;
$$;

-- ── 4. Daily usage ledger ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_feature_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('essay_grade', 'live_examiner')),
  usage_day date NOT NULL,
  uses integer NOT NULL DEFAULT 0,
  -- For live_examiner: the (normalised) question that day's one session is
  -- locked to. Unused for essay_grade.
  detail text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, usage_day)
);
ALTER TABLE public.daily_feature_usage ENABLE ROW LEVEL SECURITY;
-- Read-only for the owner. Nobody but the SECURITY DEFINER functions below
-- can write, so a user can never reset or edit their own count.
GRANT SELECT ON public.daily_feature_usage TO authenticated;
GRANT ALL ON public.daily_feature_usage TO service_role;
DROP POLICY IF EXISTS daily_feature_usage_own_read ON public.daily_feature_usage;
CREATE POLICY daily_feature_usage_own_read ON public.daily_feature_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Essay grading: atomically reserve one of today's gradings. The
-- INSERT … ON CONFLICT DO UPDATE … WHERE is a single row-locked statement, so
-- ten parallel requests still can't squeeze past the limit.
CREATE OR REPLACE FUNCTION public.reserve_essay_grading()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit integer := public.app_essay_daily_limit();
  v_uses integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF public.has_role(v_uid, 'admin') THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true);
  END IF;

  INSERT INTO public.daily_feature_usage AS d (user_id, feature, usage_day, uses)
  VALUES (v_uid, 'essay_grade', public.app_today(), 1)
  ON CONFLICT (user_id, feature, usage_day)
  DO UPDATE SET uses = d.uses + 1, updated_at = now()
    WHERE d.uses < v_limit
  RETURNING uses INTO v_uses;

  IF v_uses IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'limit', v_limit);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'used', v_uses, 'limit', v_limit);
END;
$$;

-- Give the slot back when the AI call itself failed (not the student's fault).
CREATE OR REPLACE FUNCTION public.refund_essay_grading()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.daily_feature_usage
  SET uses = greatest(uses - 1, 0), updated_at = now()
  WHERE user_id = auth.uid()
    AND feature = 'essay_grade'
    AND usage_day = public.app_today();
END;
$$;

-- Live Examiner: ONE session per day, hard-bound to ONE question. The first
-- call of the day claims the slot; later calls are fine only for that same
-- question (so the student can keep writing, autosave and re-check).
CREATE OR REPLACE FUNCTION public.claim_live_examiner_session(p_question text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_key text := lower(regexp_replace(btrim(coalesce(p_question, '')), '\s+', ' ', 'g'));
  v_existing text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF public.has_role(v_uid, 'admin') THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true);
  END IF;
  IF v_key = '' THEN
    RAISE EXCEPTION 'A question is required.';
  END IF;

  INSERT INTO public.daily_feature_usage (user_id, feature, usage_day, uses, detail)
  VALUES (v_uid, 'live_examiner', public.app_today(), 1, v_key)
  ON CONFLICT (user_id, feature, usage_day) DO NOTHING;

  IF FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'new_session', true);
  END IF;

  SELECT detail INTO v_existing
  FROM public.daily_feature_usage
  WHERE user_id = v_uid AND feature = 'live_examiner' AND usage_day = public.app_today();

  IF v_existing = v_key THEN
    RETURN jsonb_build_object('allowed', true, 'new_session', false);
  END IF;
  RETURN jsonb_build_object('allowed', false);
END;
$$;

-- ── 5. Presence ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen timestamptz NOT NULL DEFAULT now(),
  path text
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_presence TO service_role;

CREATE OR REPLACE FUNCTION public.touch_presence(p_path text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_presence (user_id, last_seen, path)
  VALUES (auth.uid(), now(), left(p_path, 200))
  ON CONFLICT (user_id) DO UPDATE SET last_seen = now(), path = left(p_path, 200);
END;
$$;

-- ── 6. Admin functions ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  RETURN jsonb_build_object(
    'max_users', public.app_user_cap(),
    'essay_daily_limit', public.app_essay_daily_limit(),
    'current_users', (SELECT count(*) FROM auth.users),
    'waitlist_count', (SELECT count(*) FROM public.signup_waitlist)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_settings(
  p_max_users integer DEFAULT NULL,
  p_essay_daily_limit integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();

  IF p_max_users IS NOT NULL THEN
    IF p_max_users < 1 OR p_max_users > 1000 THEN
      RAISE EXCEPTION 'Max users must be between 1 and 1000.';
    END IF;
    -- Same lock the signup gate uses, so the change can't race a signup.
    PERFORM pg_advisory_xact_lock(hashtext('marginal_user_cap'));
    INSERT INTO public.app_settings (key, int_value) VALUES ('max_users', p_max_users)
    ON CONFLICT (key) DO UPDATE SET int_value = EXCLUDED.int_value, updated_at = now();
  END IF;

  IF p_essay_daily_limit IS NOT NULL THEN
    IF p_essay_daily_limit < 1 OR p_essay_daily_limit > 200 THEN
      RAISE EXCEPTION 'Essays per day must be between 1 and 200.';
    END IF;
    INSERT INTO public.app_settings (key, int_value) VALUES ('essay_daily_limit', p_essay_daily_limit)
    ON CONFLICT (key) DO UPDATE SET int_value = EXCLUDED.int_value, updated_at = now();
  END IF;

  RETURN public.admin_get_settings();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_waitlist()
RETURNS TABLE (id uuid, email text, full_name text, created_at timestamptz, "position" bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._require_admin();
  RETURN QUERY
  SELECT w.id, w.email, w.full_name, w.created_at,
         row_number() OVER (ORDER BY w.created_at, w.id) AS "position"
  FROM public.signup_waitlist w
  ORDER BY w.created_at, w.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_waitlist(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  DELETE FROM public.signup_waitlist WHERE id = p_id;
END;
$$;

-- One row per account: who they are, whether they are online right now, and
-- how much they use the platform. Powers the admin Overview + Users search.
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
  ORDER BY u.created_at DESC;
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────
-- Internal helpers: not callable from the API at all.
REVOKE ALL ON FUNCTION public.app_setting_int(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_user_cap() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_essay_daily_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._require_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.signup_decision(text) FROM PUBLIC, anon, authenticated;

-- Public (sign-up form + homepage).
REVOKE ALL ON FUNCTION public.join_waitlist(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_signup_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_waitlist(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_signup_status() TO anon, authenticated;

-- Signed-in users.
REVOKE ALL ON FUNCTION public.reserve_essay_grading() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.refund_essay_grading() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_live_examiner_session(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_presence(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_essay_grading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_essay_grading() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_live_examiner_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_presence(text) TO authenticated;

-- Admin (each function re-checks the admin role itself).
REVOKE ALL ON FUNCTION public.admin_get_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_settings(integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_waitlist() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_waitlist(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_user_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_settings(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_waitlist() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_waitlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_activity() TO authenticated;

-- The trigger function stays locked down exactly as before.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
