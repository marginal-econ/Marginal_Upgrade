-- The city-aware frontend validates and always supplies a city. During the
-- rollout, however, the older Worker can still have live OTP challenges that
-- predate that field. Do not turn a correct code into a server error for those
-- challenges; preserve NULL for legacy submissions. New requests remain
-- mandatory because the current API validates city before creating the code.
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

  submitted_city := NULLIF(btrim(COALESCE(challenge.signup->>'city', '')), '');
  IF submitted_city IS NOT NULL AND (
    char_length(submitted_city) < 2 OR char_length(submitted_city) > 100
    OR submitted_city ~* '(https?://|www\.|@)'
  ) THEN
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
