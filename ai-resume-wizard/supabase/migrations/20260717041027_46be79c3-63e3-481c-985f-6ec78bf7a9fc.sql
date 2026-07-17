insert into public.changelog (title, body, category, published, published_at, created_by)
select 'Audit pass: prompt-injection, CSV, and landing-page fixes',
'Interview Prep now treats the job description as untrusted data the same way the tailor flow does, so instructions hidden in a posting can''t steer the answers. CSV exports of your applications and matches now guard against spreadsheet formula-injection (a cell that starts with = or @ is treated as plain text). The landing page no longer flashes or throws a hydration warning when a signed-in user lands on /.',
'improved', true, now(), ur.user_id
from public.user_roles ur where ur.role = 'admin' limit 1;