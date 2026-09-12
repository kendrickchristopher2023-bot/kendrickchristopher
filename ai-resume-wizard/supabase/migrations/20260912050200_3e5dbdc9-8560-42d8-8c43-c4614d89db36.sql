insert into public.changelog (title, body, category, published, published_at)
values (
  'Your included resume rewrite is only used when you save it',
  'Before, the one rewrite included with your plan was counted as used as soon as the AI produced a draft — so if you discarded it, refreshed the page, or navigated away, you lost it. Now it is only counted when you actually save a rewritten resume. You can generate a draft, read it, discard it, and try again with different notes.',
  'fixed',
  true,
  now()
);