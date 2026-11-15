-- Secure definitions table RLS to prevent students from querying UPI payments, coupons, or system config
DROP POLICY IF EXISTS "definitions_read" ON public.definitions;
CREATE POLICY "definitions_read" ON public.definitions FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR (
      (category IS NULL OR category NOT IN ('upi_payment_request', 'coupon_code', 'system_config'))
      AND (term NOT ILIKE '__%')
    )
  );
