# Per-user job search kit — 5 upgrades

All work stays in the existing schema (`personal_matches`, `tailor_sessions`, `applications`, `resumes`). Zero new tables. Hard constraint respected: nothing auto-fills or auto-submits on external sites — every "apply" stays a link the human clicks; "Mark applied" only logs what the human did.

## 1. Per-user matches (replaces hardcoded `MATCHES`)

**New file:** `src/lib/matches.functions.ts` — `requireSupabaseAuth` server fns:
- `listMatches()` — `select * from personal_matches where user_id = auth.uid() order by created_at desc`
- `addMatch({ company, role, location?, tier?, role_url?, notes? })`
- `updateMatch({ id, ...patch })`
- `deleteMatch({ id })`
- `suggestMatches({ prompt })` — loads user's primary resume, calls Lovable AI gateway (`google/gemini-3-flash-preview`), returns `{ suggestions: [{ company, role, location, careers_url, why }] }`. Returns suggestions only — does NOT insert. User clicks "Add" on each.

**Rewrite** `src/routes/_authenticated/apply.matches.tsx`:
- Drop the hardcoded array. Use TanStack Query (`useSuspenseQuery` + `queryOptions`).
- Table with checkboxes (batch select for tailor), inline edit/delete, "Add match" dialog, "AI suggest" panel that shows suggestions with per-row "Add" buttons.
- Each row: existing role link → careers URL, "Tailor" button (single), and readiness badges (see #3).

## 2. Batch tailor

**New server fn** `batchTailor({ items: [{ match_id?, jd_text, company, role }] })` in `src/lib/tailor.functions.ts`:
- Loops items sequentially, calls existing tailor logic, inserts a `tailor_sessions` row per item (`user_id`, `company`, `role`, `jd_text`, `tailored_resume`, `cover_letter`).
- Returns `[{ session_id, company, role, matchScore, error? }]`.

**UI:** on `/apply/matches`, "Tailor selected (N)" button opens a dialog with a textarea per selected row (paste JD), runs batch, shows per-row progress/status. Also a "Paste multiple JDs" mode where user separates with `---`.

Also update the existing single `/apply/tailor` page to persist to `tailor_sessions` in addition to localStorage (small tweak).

## 3. Readiness dashboard (extends `/apply/matches`)

Per row, compute from queries loaded once:
- `tailor_sessions` where `company` matches → tailored ✅, cover_letter present → letter ✅, referral_dm present → referral ✅
- `applications` where `company` + `role` match → applied ✅ (show stage badge)

Show as compact badges. "Mark applied" button → opens small dialog (stage, jd_url, notes) → inserts/updates `applications` row. Purely a logger — no external submission.

New server fns in `src/lib/applications.functions.ts`: `listApplications`, `upsertApplication`.

## 4. Per-user autofill (`/apply/autofill`)

Replace hardcoded `QA` array with AI-generated answers derived from the signed-in user's resume + profile:
- New server fn `generateScreenerAnswers({ company? })` → loads user's resume, calls AI gateway with a fixed list of 12 standard screener questions, returns `{ q, a }[]` where `{{Company}}` placeholder is preserved.
- Cache result in `tailor_sessions.interview_prep` keyed loosely, or just regenerate on demand with a "Regenerate" button. Simpler: store in a new small localStorage cache keyed by user id + hash of resume version; regenerate button explicit.
- Page: on mount, if no cached answers, show "Generate my screener answers" CTA; after generation, same copy-button layout as today.

## 5. ATS formatting lint

**New pure function** `src/lib/ats-lint.ts` — `lintResumeForAts(resume: MasterResume): { level: 'ok'|'warn'|'error', code, message }[]`. Checks:
- Missing standard section headers (Summary, Experience, Education, Skills)
- Contact info: ensure name/email/phone present at `resume.contact`, not only in a header/footer field
- Bullets using non-standard bullet chars (▪◆★✦→ etc.) — recommend `•` or `-`
- Bullets over ~40 words (parser-hostile run-on)
- Empty experience/education arrays
- Skills present and non-empty

Exports in `pdf-lib`/`docx` are already single-column per prior turn — add an assertion comment. No content manipulation, no keyword stuffing, no invisible-text tricks.

**UI:** show lint results as a panel on `/resume` (top of page) and inside the tailor result view. Each finding: level badge + message + which field.

## Files touched

- New: `src/lib/matches.functions.ts`, `src/lib/applications.functions.ts`, `src/lib/ats-lint.ts`, `src/lib/screener.functions.ts`, `src/components/AtsLintPanel.tsx`, `src/components/MatchRow.tsx` (or inline).
- Edited: `src/routes/_authenticated/apply.matches.tsx` (major rewrite), `src/routes/_authenticated/apply.autofill.tsx` (rewrite), `src/routes/_authenticated/resume.tsx` (add lint panel), `src/lib/tailor.functions.ts` (add batchTailor + persist to tailor_sessions).
- No schema migration needed.

## Out of scope (per hard constraint)

No browser extension, no headless form-filling, no ATS bypass, no invisible text, no external submission. "Apply" stays a link; "Mark applied" is a manual log.

Proceed?