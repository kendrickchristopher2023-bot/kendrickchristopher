insert into public.changelog (title, body, category, published, published_at, created_by)
select
  'A proper front door, plus a self-serve sign-in link',
  E'The app now has its own landing page at the home URL — Application Kit — so anyone visiting knows exactly what this is and how to get in. Christopher''s portfolio moved to /christopher and still works as before.\n\nSign-in got a real upgrade too: if you forget your password, enter your email and tap "Email me a sign-in link" — we''ll send a one-click sign-in link straight to your inbox. Only works for existing approved accounts.',
  'improved',
  true,
  now(),
  (select user_id from public.user_roles where role = 'admin' limit 1)
where exists (select 1 from public.user_roles where role = 'admin');