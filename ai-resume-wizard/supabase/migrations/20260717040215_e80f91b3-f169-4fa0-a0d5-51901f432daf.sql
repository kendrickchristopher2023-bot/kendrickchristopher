insert into public.changelog (title, body, category, published, published_at, created_by)
select 'Assistant knows about recent changes',
'The in-app chat assistant now answers setup and how-to questions directly from the FAQ and Getting Started guide, and knows about recent updates: editable tailored output, two-mode Autofill, CSV exports for applications and matches, expanded job pool (USAJOBS, SmartRecruiters), and the landing page / portfolio split.',
'improved', true, now(), ur.user_id
from public.user_roles ur where ur.role = 'admin' limit 1;