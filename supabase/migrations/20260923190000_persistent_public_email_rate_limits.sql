CREATE TABLE IF NOT EXISTS public.public_email_rate_limits (
  bucket text NOT NULL,
  requester_hash text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, requester_hash)
);

ALTER TABLE public.public_email_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_email_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.public_email_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_public_email_rate_limit(
  p_bucket text,
  p_requester_hash text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_row public.public_email_rate_limits%ROWTYPE;
  current_time timestamptz := clock_timestamp();
  retry_after integer;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) > 120
     OR p_requester_hash IS NULL OR length(p_requester_hash) <> 64
     OR p_limit < 1 OR p_limit > 1000
     OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters';
  END IF;

  INSERT INTO public.public_email_rate_limits(
    bucket, requester_hash, window_started_at, request_count
  )
  VALUES (p_bucket, p_requester_hash, current_time, 1)
  ON CONFLICT (bucket, requester_hash) DO UPDATE
  SET window_started_at = CASE
        WHEN public.public_email_rate_limits.window_started_at
             <= current_time - make_interval(secs => p_window_seconds)
          THEN current_time
        ELSE public.public_email_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN public.public_email_rate_limits.window_started_at
             <= current_time - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE public.public_email_rate_limits.request_count + 1
      END
  RETURNING * INTO current_row;

  DELETE FROM public.public_email_rate_limits
  WHERE window_started_at < current_time - interval '2 days';

  retry_after := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (
      current_row.window_started_at
      + make_interval(secs => p_window_seconds)
      - current_time
    )))::integer
  );

  RETURN jsonb_build_object(
    'allowed', current_row.request_count <= p_limit,
    'retryAfterSeconds', retry_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_public_email_rate_limit(text,text,integer,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_public_email_rate_limit(text,text,integer,integer)
TO service_role;
