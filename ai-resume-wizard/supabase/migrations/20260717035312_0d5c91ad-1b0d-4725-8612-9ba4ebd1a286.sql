insert into public.changelog (title, body, category, published, published_at, created_by)
select
  'Application Autofill: targeted answers, editable, per-job',
  'Autofill now has two modes. Leave company and role blank for a reusable set of answers with {{Company}} stop-signs — this is what the browser extension autofills from. Fill company, role, or paste a job description for a targeted set written specifically for that job, with the company named naturally and no placeholders (these stay on the page and do not overwrite your reusable set). You can now edit every answer inline, add your own custom questions, and open Autofill directly from a saved match via the "Autofill" link on the Matches page. When a posting contains text aimed at applicants (e.g. "please mention the word X"), we surface it instead of copying it into your answers.',
  'improved',
  true,
  now(),
  (select id from auth.users where email ilike '%kendrick%' order by created_at limit 1);