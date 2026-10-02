-- Pending verifications never become auth users or count towards the waitlist.
CREATE TABLE public.waitlist_email_codes (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  signup jsonb NOT NULL,
  code_hash text NOT NULL,
  requester_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  attempts integer NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false
);
CREATE INDEX ON public.waitlist_email_codes(email, created_at);
CREATE INDEX ON public.waitlist_email_codes(requester_hash, created_at);
ALTER TABLE public.waitlist_email_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist_email_codes FROM anon, authenticated;
GRANT ALL ON public.waitlist_email_codes TO service_role;

CREATE FUNCTION public.request_waitlist_code(p_id uuid, p_email text, p_signup jsonb, p_hash text, p_requester text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Serialize requests across Worker instances, for both recipient and sender.
  PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || p_requester, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || p_email, 0));
  IF EXISTS (SELECT 1 FROM waitlist_email_codes WHERE email = p_email AND created_at > now() - interval '60 seconds')
     OR (SELECT count(*) FROM waitlist_email_codes WHERE email = p_email AND created_at > now() - interval '1 hour') >= 5
     OR (SELECT count(*) FROM waitlist_email_codes WHERE requester_hash = p_requester AND created_at > now() - interval '1 hour') >= 30
  THEN RETURN false; END IF;
  DELETE FROM waitlist_email_codes WHERE created_at < now() - interval '1 day';
  UPDATE waitlist_email_codes SET consumed = true WHERE email = p_email AND NOT consumed;
  INSERT INTO waitlist_email_codes(id, email, signup, code_hash, requester_hash)
  VALUES(p_id, p_email, p_signup, p_hash, p_requester);
  RETURN true;
END;
$$;

CREATE FUNCTION public.verify_waitlist_code(p_id uuid, p_hash text, p_referral_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  challenge waitlist_email_codes%ROWTYPE;
  member waitlist%ROWTYPE;
  was_existing boolean;
  ref text;
  queue_position bigint;
BEGIN
  SELECT * INTO challenge FROM waitlist_email_codes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR challenge.consumed OR challenge.expires_at <= now() OR challenge.attempts >= 5
  THEN RETURN NULL; END IF;
  UPDATE waitlist_email_codes SET attempts = attempts + 1 WHERE id = p_id;
  IF challenge.code_hash <> p_hash THEN RETURN NULL; END IF;
  -- Serialize two verifications for the same email and make consumption + join atomic.
  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || challenge.email, 0));
  SELECT * INTO member FROM waitlist WHERE lower(email) = challenge.email;
  was_existing := FOUND;
  IF NOT was_existing THEN
    SELECT referral_code INTO ref FROM waitlist
    WHERE referral_code = challenge.signup->>'referredBy' AND lower(email) <> challenge.email;
    INSERT INTO waitlist(email, name, referral_code, referred_by, source, status)
    VALUES(challenge.email, challenge.signup->>'name', p_referral_code, ref,
      COALESCE(challenge.signup->>'source', 'website'), 'waiting') RETURNING * INTO member;
  END IF;
  UPDATE waitlist_email_codes SET consumed = true WHERE id = p_id;
  SELECT count(*) INTO queue_position FROM waitlist WHERE (created_at, id) <= (member.created_at, member.id);
  RETURN jsonb_build_object('duplicate', was_existing, 'referralCode', member.referral_code, 'position', queue_position);
END;
$$;
REVOKE ALL ON FUNCTION public.request_waitlist_code(uuid,text,jsonb,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_waitlist_code(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_waitlist_code(uuid,text,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_waitlist_code(uuid,text,text) TO service_role;
