-- Completed and failed delivery attempts must not prevent a legitimate user
-- from requesting another verification code. Only live challenges count.
CREATE OR REPLACE FUNCTION public.request_waitlist_code(
  p_id uuid,
  p_email text,
  p_signup jsonb,
  p_hash text,
  p_requester text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || p_requester, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || p_email, 0));

  IF EXISTS (
       SELECT 1 FROM waitlist_email_codes
       WHERE email = p_email AND NOT consumed
         AND created_at > now() - interval '60 seconds'
     )
     OR (
       SELECT count(*) FROM waitlist_email_codes
       WHERE email = p_email AND NOT consumed
         AND created_at > now() - interval '1 hour'
     ) >= 5
     OR (
       SELECT count(*) FROM waitlist_email_codes
       WHERE requester_hash = p_requester AND NOT consumed
         AND created_at > now() - interval '1 hour'
     ) >= 30
  THEN
    RETURN false;
  END IF;

  DELETE FROM waitlist_email_codes
  WHERE created_at < now() - interval '1 day' OR consumed;
  UPDATE waitlist_email_codes SET consumed = true
  WHERE email = p_email AND NOT consumed;
  INSERT INTO waitlist_email_codes(id, email, signup, code_hash, requester_hash)
  VALUES(p_id, p_email, p_signup, p_hash, p_requester);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.request_waitlist_code(uuid,text,jsonb,text,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_waitlist_code(uuid,text,jsonb,text,text)
TO service_role;

-- Release addresses affected by failed Mailjet attempts before this fix.
DELETE FROM public.waitlist_email_codes WHERE consumed;
