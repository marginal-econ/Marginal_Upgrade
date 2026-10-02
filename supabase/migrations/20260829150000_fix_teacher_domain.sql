-- Fixes a real, already-live bug: migration 20260828120000 hardcoded the
-- teacher email domain as "csaicoimbatore.com" (extra "i"). The real
-- domain is "csacoimbatore.com" — confirmed directly. Since that migration,
-- every teacher signup from the real domain has either been silently
-- downgraded to a student account, or hard-rejected outright with
-- "Teacher accounts require a @csaicoimbatore.com email."
--
-- This migration only fixes the domain going forward and reconciles
-- existing rows — it does not touch anything unrelated to roles.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role public.app_role;
  wants_teacher boolean;
BEGIN
  wants_teacher := COALESCE((NEW.raw_user_meta_data ->> 'wants_teacher')::boolean, false);

  IF NEW.email ILIKE 'retired-admin@marginal.invalid' THEN
    assigned_role := 'admin';
  ELSIF wants_teacher AND NEW.email ILIKE '%@csacoimbatore.com' THEN
    assigned_role := 'teacher';
  ELSIF wants_teacher THEN
    -- Hard rejection: aborts this entire transaction, so no profile, no
    -- user_roles row, and no auth.users row survive either.
    RAISE EXCEPTION
      'Teacher accounts require a @csacoimbatore.com email. Sign up without teacher access to use this as a student.'
      USING ERRCODE = 'insufficient_privilege';
  ELSE
    assigned_role := 'student';
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

  RETURN NEW;
END;
$$;

-- Anyone on the real @csacoimbatore.com domain who ticked "I'm a teacher"
-- at signup but ended up "student" because of the wrong domain gets
-- corrected to teacher now.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'teacher'
FROM auth.users u
WHERE u.email ILIKE '%@csacoimbatore.com'
  AND COALESCE((u.raw_user_meta_data ->> 'wants_teacher')::boolean, false) = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role IN ('teacher', 'admin')
  )
ON CONFLICT (user_id, role) DO NOTHING;

-- Conversely: anyone who is "teacher" but is neither admin nor on the real
-- domain reverts to student (covers the very unlikely case an account was
-- created directly against the wrong domain while the bug was live).
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND ur.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r2 WHERE r2.user_id = u.id AND r2.role = 'admin'
  )
  AND u.email NOT ILIKE '%@csacoimbatore.com';

-- Anyone who lost their only role row in the DELETE above falls back to
-- student explicitly.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- Sanity check — run after applying, to confirm every teacher/admin row is
-- on the right domain (or is the hardcoded admin account):
-- SELECT u.email, ur.role FROM auth.users u
--   JOIN public.user_roles ur ON ur.user_id = u.id
--   WHERE ur.role IN ('teacher', 'admin')
--   ORDER BY ur.role, u.email;
