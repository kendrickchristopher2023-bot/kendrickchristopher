## Part A — Refresh reliability (higher priority)

**Diagnose first, then fix.** Before assuming a code change I'll:
1. Curl dispatch mode (`POST /api/public/hooks/refresh-jobs`) and the `?slice=usajobs:charlotte` slice against the live URL and read the actual error body (500 / 502 root cause). Common culprits given the stack:
   - Dispatch: the SQL `dispatch_refresh_slices()` uses `x-cron-secret` header, but `refresh-jobs` now goes through `verifyCronRequest` which likely expects `apikey` / bearer. Header mismatch = 401, but a thrown error on unknown header shape = 500.
   - USAJOBS 502: adapter throws → route re-throws → Worker returns 502. Likely `USAJOBS_API_KEY` missing at handler scope, `LocationName` mismatch, or per-metro request timeout blowing the whole slice.
2. Report the actual error text back before patching.

**Observability (the real lesson):**
- Migration: `public.refresh_runs` (id, slice, started_at, finished_at, ok, jobs_upserted, companies_ok, companies_failed, error text, request_id). RLS: only admins select via `has_role`. GRANTS for authenticated + service_role.
- `runRefreshSlice` in `src/lib/jobs.refresh.server.ts` writes a row on entry (started_at) and updates on exit with outcome — inside a try/finally so a throw still records `ok=false, error=…`. Dispatch mode also records a row per slice it fans out (or a single dispatch row with request_ids).
- `/admin` (in `src/routes/_authenticated/_admin/admin.index.tsx`) gets a "Refresh health" panel listing every known slice with: last run time, ok/failed badge, jobs upserted, age (red if >36h), last error truncated. Uses a new `listRefreshRuns` server fn (admin-gated).

**Fixes to the two known breakages:**
- Dispatch 500: align auth. Either update `dispatch_refresh_slices()` to send whatever `verifyCronRequest` accepts, or make `verifyCronRequest` accept both `x-cron-secret` and `apikey`. I'll pick the smaller diff after reading `cron-auth.server.ts`.
- USAJOBS 502: wrap the metro loop's outer error path, cap per-metro time, and if `USAJOBS_API_KEY` is missing return a structured `{ ok:false, error:"USAJOBS_API_KEY missing" }` recorded to `refresh_runs` rather than a Worker 502.

**Verification (real, not status-code):**
- Curl dispatch, wait, then `select slice, ok, jobs_upserted, error, finished_at from refresh_runs order by finished_at desc` and paste the actual numbers back — including per-source counts and the SE (`region in ('NC','SC','GA','TN','VA','FL')`) count for usajobs. If USAJOBS 401s, I'll say so and stop.

## Part B — Generic export system

**One endpoint, one component. Existing 4 endpoints untouched.**

- New `POST /api/export`: body `{ format: "pdf"|"docx"|"csv", filename, title?, subtitle?, sections?: [{heading?, body?, items?:string[], kv?:{label,value}[]}], rows?: string[][], headers?: string[] }`. PDF uses pdf-lib (mirroring resume export's sanitize/wrap), DOCX uses `docx` package, CSV built with a proper escaper (quote wrap, `"` doubling, CRLF, handles commas/newlines/quotes). Zod-validated body, size cap.
- New `src/components/DownloadButtons.tsx` — PDF + DOCX (or CSV) buttons; only renders when content exists; posts to `/api/export`; triggers browser download; disabled while pending.
- CSV helper `src/lib/csv.ts` with unit-safe escaping; also `sanitizeFilename` helper.

**Wired into:**
1. **Interview Prep** (`/apply/interview-prep`) — PDF+DOCX; sends current edited `answers` state; sections = one per Q with S/T/A/R. Filename `{Name}_Interview_{Company}.pdf`.
2. **Autofill** (`/apply/autofill`) — PDF+DOCX of screener Q&A as reference.
3. **Referral DM** & **Follow-up** — small secondary "Download .txt" (uses `/api/export` with `format:"txt"` — actually simpler to do a client-side blob download for plain text; no endpoint needed). Copy stays primary.
4. **LinkedIn About/headlines** on `/apply` — PDF+DOCX+txt.
5. **Applications tracker** → "Export CSV" (company, role, stage, source, applied_at, jd_url, notes).
6. **My Jobs / matches** → "Export CSV".
7. Remove stale `public/application_tracker.csv` (confirmed leftover — not referenced anywhere in code).

**Rules I'll enforce:** downloads read live component state (never a stale server round-trip), consistent filenames, button hidden when empty.

## Testing

- Curl `/api/export` for pdf/docx/csv, save the files, actually open with `python3 -c "import pypdf..."` / `unzip -p ... word/document.xml` / open in a CSV reader, assert non-empty and contain the sample text — including a note field with commas + newlines + quotes for CSV escaping.
- Existing 4 endpoints: curl one PDF & one DOCX to confirm unchanged bytes-good.
- Playwright headless load `/admin`, `/apply/interview-prep`, `/apply/autofill`, `/apply/matches`, `/apply` — zero console errors.
- `bunx tsgo --noEmit` zero output.
- Publish, confirm live, add ONE user-facing changelog entry covering both ("Job pool refresh now visible in admin + fixed silently-broken sources" and "Download anything the app generates — PDF, Word, or spreadsheet").

## Technical notes

- Migration ordering: CREATE TABLE → GRANT (authenticated read-own-none, service_role all; admin reads via `has_role` policy) → ENABLE RLS → POLICY.
- `refresh_runs` writes use `supabaseAdmin` (loaded inside handler, never at module scope of `.functions.ts`).
- No changes to `jobs.functions.ts` (per hard rule).
- `/api/export` lives at `src/routes/api.export.ts` (not `api/public/`) — it's app-internal.

## Out of scope

- Rewriting the 4 existing bespoke resume/cover-letter endpoints.
- Any UX/nav change beyond adding download buttons where content exists.
- New job sources / adapters.

If you approve, I'll start with Part A step 1 (curl the live endpoints and read the real errors) before writing any code.