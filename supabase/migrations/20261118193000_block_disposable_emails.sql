-- ---------------------------------------------------------------------------
-- Migration: 20261118193000_block_disposable_emails.sql
-- Description: Block disposable and temporary email addresses at the database level.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
  user_avatar TEXT;
  assigned_role public.app_role;
BEGIN
  user_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data ->> 'email'
  );

  -- Abort signup if a disposable or temporary email address is detected
  IF user_email ~* '(@|\.)(tempmail|temp-mail|10minutemail|guerrillamail|mailinator|yopmail|trashmail|sharklasers|burnermail|dropmail|mohmal|crazymail|getairmail|dispostable|inboxkitten|fakemail|generator\.email|anonymbox|mytemp|emailfake)\.' THEN
    RAISE EXCEPTION 'Temporary or disposable email addresses are not permitted on Marginal.'
      USING ERRCODE = 'check_violation';
  END IF;

  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(user_email, '@', 1)
  );

  user_avatar := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture'
  );

  -- Upsert into profiles: creates new profile or synchronizes updated OAuth data
  INSERT INTO public.profiles (id, full_name, email, avatar_url, updated_at)
  VALUES (
    NEW.id,
    user_full_name,
    user_email,
    user_avatar,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Assign default student role if no role exists yet
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    -- If there are no users yet, first user is admin; otherwise student
    IF EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
      assigned_role := 'student';
    ELSE
      assigned_role := 'admin';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
