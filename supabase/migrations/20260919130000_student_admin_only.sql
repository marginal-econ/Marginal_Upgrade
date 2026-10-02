-- Marginal is a student + administrator product. Retire teacher privilege
-- without deleting historical data or rewriting older migrations.

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'student'::public.app_role
FROM public.user_roles
WHERE role = 'teacher'
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles WHERE role = 'teacher';

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- No signed-in user may promote themselves into the initial admin seat.
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.signup_decision(p_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_users integer;
  v_free integer;
  v_ahead integer;
  v_created timestamptz;
BEGIN
  SELECT count(*) INTO v_users FROM auth.users WHERE lower(email) <> v_email;
  v_free := public.app_user_cap() - v_users;
  IF v_free <= 0 THEN RETURN 'waitlist'; END IF;

  SELECT created_at INTO v_created FROM public.signup_waitlist WHERE lower(email) = v_email;
  IF v_created IS NOT NULL THEN
    SELECT count(*) INTO v_ahead FROM public.signup_waitlist WHERE created_at < v_created;
  ELSE
    SELECT count(*) INTO v_ahead FROM public.signup_waitlist;
  END IF;

  IF v_ahead < v_free THEN RETURN 'allow'; END IF;
  RETURN 'waitlist';
END;
$$;

-- New accounts are always students. Initial admin creation is an explicit
-- service-role/SQL setup step documented in SUPABASE_SETUP.md.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('marginal_user_cap'));
  IF public.signup_decision(NEW.email) <> 'allow' THEN
    RAISE EXCEPTION 'SIGNUPS_FULL: Marginal is at capacity right now — you have been added to the waitlist instead.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.signup_waitlist WHERE lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Remove the retired classroom data model after application routes and
-- assignment integrations have been removed. Older migrations stay intact
-- so existing deployments retain a complete, ordered migration history.
ALTER TABLE IF EXISTS public.essays DROP COLUMN IF EXISTS assignment_id;
ALTER TABLE IF EXISTS public.mcq_attempts DROP COLUMN IF EXISTS assignment_id;
ALTER TABLE IF EXISTS public.mcq_pdf_attempts DROP COLUMN IF EXISTS assignment_id;
DROP VIEW IF EXISTS public.classroom_roster;
DROP FUNCTION IF EXISTS public.join_classroom_by_code(text);
DROP TRIGGER IF EXISTS classrooms_join_code ON public.classrooms;
DROP FUNCTION IF EXISTS public.classrooms_set_join_code();
DROP FUNCTION IF EXISTS public.generate_classroom_join_code();
DROP TABLE IF EXISTS public.classroom_assignments;
DROP POLICY IF EXISTS classrooms_select ON public.classrooms;
DROP TABLE IF EXISTS public.classroom_members;
DROP TABLE IF EXISTS public.classrooms;
