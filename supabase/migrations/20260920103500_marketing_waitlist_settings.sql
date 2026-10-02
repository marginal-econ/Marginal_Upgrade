-- Public-site waitlist and server-managed site settings.
-- Browser clients receive no direct table access; server code uses the
-- Supabase secret key after validating each request.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  referral_code text UNIQUE,
  referred_by text,
  source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website';
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'waiting';

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique_idx
  ON public.waitlist (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_referral_code_unique_idx
  ON public.waitlist (referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist (created_at);
CREATE INDEX IF NOT EXISTS waitlist_referred_by_idx
  ON public.waitlist (referred_by) WHERE referred_by IS NOT NULL;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_settings FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO service_role;
