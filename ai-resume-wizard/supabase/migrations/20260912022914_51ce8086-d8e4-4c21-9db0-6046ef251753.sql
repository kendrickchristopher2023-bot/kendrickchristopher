insert into public.changelog (title, body, category, published, published_at, created_by)
values (
  'Clearer warning on invite links',
  'Admin invite links now come with a prominent reminder that the link signs in whoever opens it, so it should be sent to the invited person and never opened in the admin''s own browser. The copy action is labeled with the invitee''s email to make that obvious.',
  'improved',
  true,
  now(),
  '37d308dc-56ad-4597-a3d7-b24847c466d4'
)
on conflict do nothing;