-- Migration: Signup Email OTP Verification
-- Records and verifies 6-digit OTP codes for new student registrations dispatched via Mailjet.

CREATE TABLE IF NOT EXISTS public.signup_email_otps (
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

CREATE INDEX IF NOT EXISTS idx_signup_email_otps_email ON public.signup_email_otps(email, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_email_otps_requester ON public.signup_email_otps(requester_hash, created_at);

ALTER TABLE public.signup_email_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.signup_email_otps FROM anon, authenticated;
GRANT ALL ON public.signup_email_otps TO service_role;
