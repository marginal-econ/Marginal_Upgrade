-- Collect a required city for new website-waitlist members. Historical rows
-- remain valid and show as "City not recorded" in the admin console.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.waitlist
  DROP CONSTRAINT IF EXISTS waitlist_city_format;

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_city_format CHECK (
    city IS NULL OR (
      char_length(btrim(city)) BETWEEN 2 AND 100
      AND city !~* '(https?://|www\.|@)'
    )
  );

CREATE OR REPLACE FUNCTION public.verify_waitlist_code(
  p_id uuid,
  p_hash text,
  p_referral_code text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  challenge waitlist_email_codes%ROWTYPE;
  member waitlist%ROWTYPE;
  was_existing boolean;
  ref text;
  queue_position bigint;
  submitted_city text;
BEGIN
  SELECT * INTO challenge FROM waitlist_email_codes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR challenge.consumed OR challenge.expires_at <= now() OR challenge.attempts >= 5
  THEN RETURN NULL; END IF;

  UPDATE waitlist_email_codes SET attempts = attempts + 1 WHERE id = p_id;
  IF challenge.code_hash <> p_hash THEN RETURN NULL; END IF;

  submitted_city := btrim(COALESCE(challenge.signup->>'city', ''));
  IF char_length(submitted_city) < 2 OR char_length(submitted_city) > 100
     OR submitted_city ~* '(https?://|www\.|@)' THEN
    RAISE EXCEPTION 'Enter a valid city before joining the waitlist.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || challenge.email, 0));
  SELECT * INTO member FROM waitlist WHERE lower(email) = challenge.email;
  was_existing := FOUND;
  IF NOT was_existing THEN
    SELECT referral_code INTO ref FROM waitlist
    WHERE referral_code = challenge.signup->>'referredBy' AND lower(email) <> challenge.email;
    INSERT INTO waitlist(email, name, city, referral_code, referred_by, source, status)
    VALUES(
      challenge.email,
      challenge.signup->>'name',
      submitted_city,
      p_referral_code,
      ref,
      COALESCE(challenge.signup->>'source', 'website'),
      'waiting'
    ) RETURNING * INTO member;
  END IF;

  UPDATE waitlist_email_codes SET consumed = true WHERE id = p_id;
  SELECT count(*) INTO queue_position
  FROM waitlist WHERE (created_at, id) <= (member.created_at, member.id);
  RETURN jsonb_build_object(
    'duplicate', was_existing,
    'referralCode', member.referral_code,
    'position', queue_position
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_waitlist_code(uuid,text,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_waitlist_code(uuid,text,text)
TO service_role;
