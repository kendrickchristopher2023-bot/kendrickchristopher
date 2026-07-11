
# Lock it down + turn it into a real (private) product

Goal: no one but you and people you invite can access the app. Each invited user gets their own resume, their own tailor history, their own metrics — nothing shared, nothing leaked. Structure is ready to flip to paid later without a rewrite.

## What changes for you today

- The public homepage (`/`) stays as your portfolio — that's your outbound artifact. Everything under `/apply`, `/resume` (edit), and the new user features move behind login.
- You sign in, everything works as it does now, plus new features (cover letters, interview prep, follow-up nudges).
- You get an admin screen to approve/deny invite requests.

## What changes for invited users

1. They land on `/` (your portfolio, unchanged).
2. Click "Request access" → email + short "why" note.
3. You approve in an admin panel → they get an email with a magic link.
4. First login: pick onboarding path — **paste/upload existing resume** (AI parses into the schema) OR **guided form** (no AI, step-by-step).
5. They then get their own copy of the whole toolkit against their data.

## Job search recommendation (my pick)

Drop the hand-curated Charlotte AI matches page for other users — it only makes sense for you. Replace with a **"Paste JD → tailor + cover letter + track"** flow as the primary loop. That flow is industry-agnostic (works for nurses, PMs, teachers, anyone) and doesn't require a jobs data source. Keep your personal Charlotte AI matches list as a **your-account-only** view so you don't lose it. Add a real jobs API (Adzuna is cheapest, ~free tier) later, once there are paying users to justify the per-query cost.

## Features being added (all four you picked)

1. **Cover letter generator** — same JD input as tailor; produces a 150–200 word letter grounded in the user's wins. One extra button on `/apply/tailor`.
2. **Interview prep** — after a tailor session, "Generate likely questions + STAR answers" using their resume + the JD. Saved per application.
3. **Follow-up nudges** — 7 days after "Applied" with no response, `/apply/metrics` surfaces a "Send follow-up" card with a drafted email. No background jobs needed — computed on page load.
4. **Chrome extension / bookmarklet** — one button on any job page: captures URL + JD text + company/role, opens the tailor flow prefilled. Bookmarklet first (ships in a day, works everywhere), Chrome extension `.zip` as a follow-up.

## Paid-service scaffolding (dormant until you say go)

- Add `plan` column to users (`free` | `pro` | `founder`). Everyone starts as `founder` while invite-only. No paywall, no Stripe, no pricing page yet.
- Feature-gate helpers (`canUseCoverLetter(user)`) in place but currently return `true` for everyone. Flipping to paid = one config change + wiring Stripe/Paddle when you approve.
- Kenroe Collective branding stays as-is (footer credit + portfolio tag). No separate business surface until you say so.

## What I think you're missing (recommended add-ons — say yes/no)

- **A. LinkedIn profile optimizer** — paste current LinkedIn "About" + headline, get a rewritten version tailored to their target role. High demand, ~half the work of the resume tailor. **Recommend: yes, ship with v1.**
- **B. Weekly digest email** — Monday morning: "You applied to 3 last week, 1 needs follow-up, here are 5 tailored resumes you can send today." Retention. **Recommend: defer until you have >5 users.**
- **C. Referral message templates per JD** — you already have `/apply/referrals`; wire it so pasting a JD generates a warm-intro DM to send to a mutual connection. **Recommend: yes, small addition.**
- **D. Delete/export their data** — legal/trust basics for anything that becomes paid. **Recommend: yes, ship with v1.**
- **E. Rate limits on AI calls** — one user could burn your Lovable AI credits. Simple per-user daily cap (e.g., 20 tailors/day). **Recommend: yes, ship with v1.**

## Technical section

- **Backend**: enable Lovable Cloud (Supabase under the hood). Auth via Supabase — email magic link + Google. No password reset flow needed with magic links.
- **Route architecture**:
  - Public: `/` (portfolio), `/request-access`, `/auth`, `/auth/callback`
  - Authenticated (`_authenticated/`): `/apply/*`, `/resume/*`, `/onboarding`, `/settings`
  - Admin (`_authenticated/_admin/`, gated by `has_role('admin')`): `/admin/invites`, `/admin/users`
- **Schema** (all with RLS scoped to `auth.uid()`, `user_roles` table pattern):
  - `profiles` (id, email, full_name, plan, onboarded_at)
  - `user_roles` (user_id, role) — `admin` | `user`
  - `access_requests` (email, reason, status: pending/approved/denied, requested_at)
  - `resumes` (user_id, data jsonb — same shape as current `MasterResume`, is_primary)
  - `tailor_sessions` (user_id, jd_url, jd_text, company, role, tailored_resume jsonb, cover_letter text, interview_prep jsonb, created_at)
  - `applications` (user_id, tailor_session_id, company, role, jd_url, source, stage, applied_at, response_at, notes) — replaces current localStorage in `/apply/metrics`
  - `personal_matches` (user_id, role, company, roleUrl) — your Charlotte list, user-scoped
  - `usage_daily` (user_id, date, tailor_count, cover_letter_count) — rate limiting
- **Server fns** all use `requireSupabaseAuth`; admin fns additionally check `has_role(auth.uid(), 'admin')`. Existing `tailor.functions.ts` and `referral.functions.ts` refactored to read/write per-user.
- **Migration**: existing `localStorage` metrics data — one-time import button on first login for you.
- **Email**: magic link via Supabase Auth (built in); invite-approved email via Resend (needs API key when we get there).
- **Onboarding parse**: paste resume → `parseResume` server fn (Lovable AI) returns `MasterResume` JSON → user reviews/edits on `/onboarding` → saved to `resumes`.

## Order of operations

1. Enable Lovable Cloud + auth setup (email magic link + Google)
2. Schema + RLS + roles + grant yourself `admin`
3. `/request-access` public page + `/admin/invites` approval flow + Resend for approval email
4. Move `/apply/*` and `/resume` under `_authenticated/`, refactor to per-user DB reads
5. `/onboarding` (paste-or-form) + resume parser
6. Cover letter + interview prep + follow-up nudges + LinkedIn optimizer + referral DM generator
7. Settings page (export data, delete account) + daily rate limits
8. Bookmarklet
9. Chrome extension `.zip`

## What I'm not doing this pass

- Stripe/Paddle wiring (dormant until your go-ahead)
- Live jobs API integration
- Weekly digest emails
- Public marketing/pricing pages beyond `/` and `/request-access`

## Decisions I need from you before I build

1. **Email for invite approvals** — Resend is the standard fit; needs an API key. OK to add when we get to step 3, or use a different sender?
2. **LinkedIn optimizer (A), referral DM generator (C), export/delete (D), rate limits (E)** — all in for v1, or drop any?
3. **Your Charlotte matches list** — keep as private-to-you `personal_matches`, or delete it and let everyone use the paste-JD flow only?
