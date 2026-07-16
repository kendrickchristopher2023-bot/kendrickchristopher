insert into public.changelog (title, body, category, published, published_at, created_by)
values (
  'Federal jobs (USAJOBS) added to Discover',
  'Discover now pulls federal government job listings from USAJOBS across 22 Southeastern metros — including Charlotte, Raleigh, Durham, Greensboro, Winston-Salem, Atlanta, Charleston, Nashville, and more. This targets the biggest coverage gap in the app: local, non-remote roles in NC/SC/GA/TN/VA/FL.

A few honest limits:
- These are U.S. federal government roles only (agencies like the VA, USDA, IRS, Army Corps, etc.) — not private employers like Bank of America or Lowe''s, which are on closed ATS platforms and can''t be fetched without scraping.
- Most federal roles publish a real salary range, so this should also improve overall pay-range coverage in the job list.
- You can turn USAJOBS off any time in Discover → Manage companies → Feed sources.',
  'new',
  false,
  null,
  '37d308dc-56ad-4597-a3d7-b24847c466d4'
);