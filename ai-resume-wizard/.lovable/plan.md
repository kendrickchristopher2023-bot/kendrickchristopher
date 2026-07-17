
## What the chatbot doesn't know today

Reading `src/routes/api.chat.ts`, the system prompt was written before the last two weeks of shipping. It still describes the app as it was, so the assistant will confidently give wrong answers about anything recent. Specifically, it doesn't know:

- The landing page is no longer Christopher's portfolio; that lives at `/christopher`. Signed-out users land on the product page.
- Tailor + Autofill outputs are **editable** before copy/download, via `TailorEdit` / `DownloadButtons`.
- Autofill has **two modes**: generic (saves to profile, used by the extension) vs targeted (component-state only, uses company/role/JD/matchId).
- Job postings sometimes contain instructions aimed at the applicant; the app now surfaces those instead of pasting them into letters (`src/lib/prompt-safety.ts`).
- CSV exports for applications/matches now exist (`/api/export`).
- USAJOBS + SmartRecruiters feeds are live; state names are normalized to 2-letter codes for regional filters.
- The Kenroe Collective cross-promo exists on `/` and `/christopher`.
- Getting-started and FAQ live at `/help/getting-started` and `/help/faq` — the assistant should paraphrase from them rather than redirecting for every "how do I..." question.

## Plan

**1. Rewrite the SYSTEM prompt in `src/routes/api.chat.ts`** to:
- Import the canonical FAQ + steps arrays from `src/routes/help.faq.tsx` and `src/routes/help.getting-started.tsx` (extract them into a shared `src/lib/help-content.ts` so the chatbot and the help pages read from one source — no drift). The help routes then import from `help-content.ts`; behavior unchanged.
- Add a "RECENT CHANGES" section covering the seven bullets above so the model stops describing the old behavior.
- Add explicit route map: `/apply`, `/apply/tailor`, `/apply/autofill`, `/apply/matches`, `/apply/interview-prep`, `/apply/referrals`, `/apply/metrics`, `/apply/rewrite`, `/resume`, `/resumes`, `/settings`, `/help/*`, `/whats-new`, `/christopher`.
- Instruct the model: when the user asks a "how do I / what is / is my data private" question, answer directly from the embedded FAQ instead of only linking out.

**2. No new tools, no client changes.** Widget UI, tool set, usage caps stay as-is. This is a grounding refresh, not a feature.

**3. Verification:** `bunx tsgo --noEmit` clean; headless `/` `/help/*` `/apply` load with no console errors (the runtime-error report shows an existing hydration mismatch on `/` unrelated to this change — I'll note it separately, not fix it in this scope unless you want it in); ask the widget three questions ("what changed recently?", "how do I export my applications?", "is the landing page my portfolio?") and confirm answers reflect current reality. Changelog entry: user-facing, "The in-app assistant now knows about recent changes and can answer setup questions directly."

---

## "What else can you check" — proactive audit I'd run next

You're right that my previous audits missed things. Here's what I'd sweep for, ranked by likely payoff. **I'm not doing these in this plan** — flag which you want and I'll scope each.

1. **Stale copy across the app.** Grep for strings that reference old behavior: "portfolio", "Christopher", "{{Company}}", hardcoded route names, "coming soon", "TODO", plus any UI text that predates editable outputs / CSV export / two-mode autofill. Same drift problem as the chatbot, just in JSX.
2. **Route inventory vs nav vs sitemap.** Enumerate every file under `src/routes/`, confirm each is reachable from `AppNav` or a documented deep-link, and check for orphaned routes or broken `<Link to>` targets. Would have caught the `/christopher` split earlier.
3. **RLS + column-grant audit.** Re-verify `profiles` column grants (only `full_name`, `email_notifications`, `screener_answers`, `enabled_feeds`, `changelog_seen_at` writable by `authenticated`); `user_roles` still has no INSERT policy; `cron_secret` has zero grants; `admin_audit_log`/`changelog`/`refresh_runs` are SELECT-only for admins.
4. **Server-function auth boundaries.** Walk every `*.functions.ts` and confirm each either uses `requireSupabaseAuth` or is intentionally public. Unauthenticated `createServerFn` is a public endpoint.
5. **Prompt-injection coverage.** `tailor` and `autofill` sanitize JD input; check `interview-prep`, `referrals`, `rewrite`, and the chat `tailor_resume` tool use the same `prompt-safety` helpers.
6. **CSV correctness.** Round-trip test: notes containing `,`, `"`, `\n`, and Excel formula-injection prefixes (`=`, `+`, `-`, `@`) — confirm the exporter escapes and prefix-guards them.
7. **Refresh pipeline health.** Query `refresh_runs` for the last 7 days per slice; alert on slices with 0 successful runs or stale `fetched_at`. This is the class of bug that keeps recurring.
8. **Placeholder discipline.** Grep generator outputs (`tailor`, `autofill`, `referral`, `followup`) for hardcoded `{{Company}}`-style substitution; enforce the "placeholders are stop signs" rule.
9. **Runtime error report.** Two hydration mismatches currently logged on `/` and `/auth` — likely a `typeof window` branch or locale-dependent `Date` in a `useState` initializer. Small standalone fix.
10. **Free-plan quota reality-check.** Confirm `increment_usage` caps match what the pricing/FAQ copy claims.

Tell me which of 1–10 to fold in and I'll expand the plan.
