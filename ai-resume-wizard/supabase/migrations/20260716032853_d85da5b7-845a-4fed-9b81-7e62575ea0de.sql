-- Changelog table for the "What's new" feature.
CREATE TABLE public.changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'improved' CHECK (category IN ('new','improved','fixed')),
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Grants: authenticated may only SELECT (RLS narrows further to published).
-- No INSERT/UPDATE/DELETE grants to authenticated — writes are service_role
-- only, executed from admin server functions after role verification.
GRANT SELECT ON public.changelog TO authenticated;
GRANT ALL   ON public.changelog TO service_role;

ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

-- Non-admin authenticated users see only published rows.
-- Admins see everything (drafts too).
CREATE POLICY "changelog read published or admin"
  ON public.changelog
  FOR SELECT
  TO authenticated
  USING (
    published = true
    OR private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE INDEX changelog_published_at_idx
  ON public.changelog (published_at DESC NULLS LAST);

CREATE TRIGGER changelog_updated_at
  BEFORE UPDATE ON public.changelog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-user "last seen" timestamp for the unread badge.
ALTER TABLE public.profiles
  ADD COLUMN changelog_seen_at timestamptz;

-- Users may update ONLY this column on their own row — matches the existing
-- column-level UPDATE grants on full_name/email_notifications/etc.
-- (Table-level UPDATE was intentionally revoked from authenticated earlier
-- to prevent privilege escalation on plan/free_resume_rewrite_used.)
GRANT UPDATE (changelog_seen_at) ON public.profiles TO authenticated;