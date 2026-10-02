-- Closed-access mode: public visitors submit only a waitlist request.
-- Supabase Auth sign-ups must also be disabled in the Dashboard. Administrators
-- can still invite or create approved accounts, which receive student access
-- by default and may then be promoted to administrator by an existing admin.

CREATE OR REPLACE FUNCTION public.signup_decision(p_email text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'waitlist'::text;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
