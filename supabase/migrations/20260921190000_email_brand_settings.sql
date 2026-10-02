-- Admin-editable branding for the transactional waitlist verification email.
-- Secrets and the OTP itself remain server-side and are never stored here.

CREATE TABLE public.email_brand_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  sender_name text NOT NULL DEFAULT 'Marginal',
  subject text NOT NULL DEFAULT 'Your Marginal verification code',
  eyebrow text NOT NULL DEFAULT 'Email verification',
  heading text NOT NULL DEFAULT 'Confirm your place on the waitlist',
  intro text NOT NULL DEFAULT 'Use the six-digit code below to verify your email and join the Marginal waitlist.',
  footer text NOT NULL DEFAULT 'Marginal · Built for AS and A Level Economics (9708)',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.email_brand_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.email_brand_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_brand_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_brand_settings TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_email_brand_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE settings public.email_brand_settings%ROWTYPE;
BEGIN
  PERFORM public._require_admin();
  SELECT * INTO settings FROM public.email_brand_settings WHERE id = true;
  RETURN jsonb_build_object(
    'sender_name', settings.sender_name,
    'subject', settings.subject,
    'eyebrow', settings.eyebrow,
    'heading', settings.heading,
    'intro', settings.intro,
    'footer', settings.footer
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_email_brand_settings(
  p_sender_name text,
  p_subject text,
  p_eyebrow text,
  p_heading text,
  p_intro text,
  p_footer text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF char_length(btrim(p_sender_name)) NOT BETWEEN 1 AND 60
    OR char_length(btrim(p_subject)) NOT BETWEEN 1 AND 120
    OR char_length(btrim(p_eyebrow)) NOT BETWEEN 1 AND 60
    OR char_length(btrim(p_heading)) NOT BETWEEN 1 AND 120
    OR char_length(btrim(p_intro)) NOT BETWEEN 1 AND 500
    OR char_length(btrim(p_footer)) NOT BETWEEN 1 AND 180
  THEN
    RAISE EXCEPTION 'One or more email fields are empty or too long.';
  END IF;

  INSERT INTO public.email_brand_settings (
    id, sender_name, subject, eyebrow, heading, intro, footer, updated_at
  ) VALUES (
    true, btrim(p_sender_name), btrim(p_subject), btrim(p_eyebrow),
    btrim(p_heading), btrim(p_intro), btrim(p_footer), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    sender_name = EXCLUDED.sender_name,
    subject = EXCLUDED.subject,
    eyebrow = EXCLUDED.eyebrow,
    heading = EXCLUDED.heading,
    intro = EXCLUDED.intro,
    footer = EXCLUDED.footer,
    updated_at = now();

  RETURN public.admin_get_email_brand_settings();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_email_brand_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_email_brand_settings(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_email_brand_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_email_brand_settings(text,text,text,text,text,text) TO authenticated;
