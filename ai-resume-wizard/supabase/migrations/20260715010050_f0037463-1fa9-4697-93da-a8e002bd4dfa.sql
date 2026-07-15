
CREATE TABLE public.app_status (
  id boolean PRIMARY KEY DEFAULT true,
  active boolean NOT NULL DEFAULT false,
  message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT app_status_singleton CHECK (id = true)
);

GRANT SELECT ON public.app_status TO authenticated;
GRANT ALL ON public.app_status TO service_role;

ALTER TABLE public.app_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app status"
  ON public.app_status FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policies: writes go through the service role from admin-only server functions.

INSERT INTO public.app_status (id, active, message) VALUES (true, false, null);
