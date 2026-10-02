-- The client (src/routes/auth.tsx) already refuses to submit a teacher
-- signup for a non-@csaicoimbatore.com email — no request even leaves the
-- browser. But the trigger below, until now, only ever downgraded a
-- mismatched signup to "student" after the account was already created.
-- That's a real gap: anyone calling supabase.auth.signUp directly (bypassing
-- the UI) with wants_teacher=true and any email gets a full account created,
-- just without the teacher role. "No account at all" requires the rejection
-- to happen server-side, in the same transaction as the insert.
--
-- Fix: when wants_teacher=true and the email is not on the real school
-- domain (and isn't the hardcoded admin), RAISE EXCEPTION inside the
-- trigger. Postgres aborts the whole transaction — including the
-- auth.users row itself — so the signup fails outright with an error,
-- exactly like the client-side gate, instead of silently succeeding as a
-- downgraded student account.
--
-- Note: this only fires when wants_teacher=true. A signup that does NOT
-- request teacher access still succeeds as a student regardless of domain —
-- unchanged, and correct: anyone should be able to use the tool as a
-- student.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assigned_role public.app_role;
  wants_teacher boolean;
BEGIN
  wants_teacher := COALESCE((NEW.raw_user_meta_data ->> 'wants_teacher')::boolean, false);

  IF NEW.email ILIKE 'retired-admin@marginal.invalid' THEN
    assigned_role := 'admin';
  ELSIF wants_teacher AND NEW.email ILIKE '%@csaicoimbatore.com' THEN
    assigned_role := 'teacher';
  ELSIF wants_teacher THEN
    -- Hard rejection: aborts this entire transaction, so no profile, no
    -- user_roles row, and no auth.users row survive either. The signup
    -- fails with this message surfaced back to the caller.
    RAISE EXCEPTION
      'Teacher accounts require a @csaicoimbatore.com email. Sign up without teacher access to use this as a student.'
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

-- No retroactive cleanup needed here: any account that already exists
-- necessarily got created before this rule existed, so it was already
-- reconciled by the previous migration (20260828090000). This migration only
-- changes what happens for signups going forward.
