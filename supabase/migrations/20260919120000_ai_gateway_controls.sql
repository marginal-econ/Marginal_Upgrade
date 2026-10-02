-- ============================================================================
-- Global AI gateway controls: a site-wide pause switch and a credit-saving
-- "mode" that every AI call in the app goes through (essay grading, Live
-- Examiner's live check + "Grade now" + "max out this answer", MCQ topic
-- tagging/explanations, diagrams, the alumni advisor, etc) — enforced once,
-- centrally, in ai.server.ts's chat(), not re-implemented per feature.
--
-- Two independent knobs, both admin-only:
--   ai_enabled : 0/1  — the "powerful limit button". Flip to 0 and every AI
--                        call in the app fails fast with a clear message,
--                        with no live outbound request made at all. The
--                        admin account is still subject to this — it is a
--                        hard site-wide pause, not a per-user limit.
--   ai_mode    : 0/1/2 — 0 = max quality (no change), 1 = balanced (caps how
--                        many tokens a single reply can cost), 2 = max
--                        savings (also swaps every call to the cheap/fast
--                        model). See applyAiGatewayMode() in ai.server.ts.
-- ============================================================================

INSERT INTO public.app_settings (key, int_value) VALUES
  ('ai_enabled', 1),
  ('ai_mode', 0)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.app_ai_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.app_setting_int('ai_enabled', 1) <> 0;
$$;

CREATE OR REPLACE FUNCTION public.app_ai_mode()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.app_setting_int('ai_mode', 0);
$$;

-- Extend the settings admins can read/write. admin_set_settings gets two new
-- optional params appended at the end (defaults NULL = "leave unchanged"),
-- so it has to be dropped and recreated rather than CREATE OR REPLACE'd —
-- Postgres treats a changed argument list as a new overload otherwise.
DROP FUNCTION IF EXISTS public.admin_set_settings(integer, integer);

CREATE OR REPLACE FUNCTION public.admin_get_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  RETURN jsonb_build_object(
    'max_users', public.app_user_cap(),
    'essay_daily_limit', public.app_essay_daily_limit(),
    'current_users', (SELECT count(*) FROM auth.users),
    'waitlist_count', (SELECT count(*) FROM public.signup_waitlist),
    'ai_enabled', public.app_ai_enabled(),
    'ai_mode', public.app_ai_mode()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_settings(
  p_max_users integer DEFAULT NULL,
  p_essay_daily_limit integer DEFAULT NULL,
  p_ai_enabled boolean DEFAULT NULL,
  p_ai_mode integer DEFAULT NULL
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

  IF p_ai_enabled IS NOT NULL THEN
    INSERT INTO public.app_settings (key, int_value)
    VALUES ('ai_enabled', CASE WHEN p_ai_enabled THEN 1 ELSE 0 END)
    ON CONFLICT (key) DO UPDATE SET int_value = EXCLUDED.int_value, updated_at = now();
  END IF;

  IF p_ai_mode IS NOT NULL THEN
    IF p_ai_mode NOT IN (0, 1, 2) THEN
      RAISE EXCEPTION 'AI mode must be 0 (max quality), 1 (balanced) or 2 (max savings).';
    END IF;
    INSERT INTO public.app_settings (key, int_value) VALUES ('ai_mode', p_ai_mode)
    ON CONFLICT (key) DO UPDATE SET int_value = EXCLUDED.int_value, updated_at = now();
  END IF;

  RETURN public.admin_get_settings();
END;
$$;

REVOKE ALL ON FUNCTION public.app_ai_enabled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_ai_mode() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_get_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_settings(integer, integer, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_settings(integer, integer, boolean, integer) TO authenticated;

-- app_ai_enabled/app_ai_mode are read straight off app_settings by the
-- server (service role), not called as RPCs from the client — but grant
-- execute to service_role explicitly for clarity/consistency with the rest
-- of this file's helpers.
GRANT EXECUTE ON FUNCTION public.app_ai_enabled() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_ai_mode() TO service_role;
