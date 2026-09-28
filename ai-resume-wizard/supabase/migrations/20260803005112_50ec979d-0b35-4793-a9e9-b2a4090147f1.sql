ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text;

-- Billing columns are server-side only: never grant them to end users.
REVOKE UPDATE (stripe_customer_id, stripe_subscription_id, subscription_status, plan)
  ON public.profiles FROM authenticated;
REVOKE UPDATE (stripe_customer_id, stripe_subscription_id, subscription_status, plan)
  ON public.profiles FROM anon;

GRANT ALL ON public.profiles TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;