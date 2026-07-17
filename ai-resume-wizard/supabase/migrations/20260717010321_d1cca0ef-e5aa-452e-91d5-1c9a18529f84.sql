insert into public.changelog (title, body, category, published, published_at, created_by)
values (
  'Simpler navigation, and your cover letter is right there',
  E'The top nav is now four things: **Find Jobs**, **My Jobs**, **My Resume**, and **Help**. Settings, What''s new, and Sign out moved into a small menu at your email in the upper right.\n\nThe home page shows one clear next action instead of a wall of tools — usually **"Apply to [Company] — [Role]"** — so it''s obvious what to do next.\n\nThe biggest fix: when you tailor a resume for a job, the tailored resume **and** the cover letter now show up as two tabs at the top of the results, with download buttons for both right above them. Before, the cover letter was buried below the resume and easy to miss even though it was already being generated.\n\nOld links (`/resumes`, `/apply/rewrite`, `/help/faq`, etc.) still work — everything''s just easier to find.',
  'improved',
  true,
  now(),
  '37d308dc-56ad-4597-a3d7-b24847c466d4'
);