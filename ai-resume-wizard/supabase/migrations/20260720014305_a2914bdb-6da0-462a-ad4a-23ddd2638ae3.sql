-- Dedup safeguard: keep earliest per (user, lower(company), lower(role)) if any duplicates slipped in
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, lower(company), lower(role)
           ORDER BY applied_at ASC, created_at ASC, id ASC
         ) AS rn
  FROM public.applications
)
DELETE FROM public.applications a USING ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS applications_user_company_role_uidx
  ON public.applications (user_id, lower(company), lower(role));