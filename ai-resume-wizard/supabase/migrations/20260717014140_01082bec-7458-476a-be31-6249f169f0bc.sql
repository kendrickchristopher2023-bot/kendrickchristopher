insert into public.changelog (title, body, category, published, published_at, created_by)
select
  'Edit your tailored resume and cover letter before you download',
  E'Three upgrades to the resume tailor:\n\n• Every field the AI produces — the summary, each set of bullets, and the cover letter — is now editable in place. Your edits are what ends up in the PDF or Word download, not the original AI text. An "edited" tag shows what you changed, and "Revert" puts the AI version back.\n\n• You can now choose what to generate: resume + cover letter (default), resume only, or cover letter only. Faster runs when you only need one.\n\n• Job postings sometimes contain text aimed at the applicant — for example asking you to include a specific word or code to prove a human read the post. We now surface that clearly above your results instead of quietly copying it into your cover letter. You decide whether to include it yourself.',
  'improved',
  true,
  now(),
  (select user_id from public.user_roles where role = 'admin' limit 1)
where exists (select 1 from public.user_roles where role = 'admin');