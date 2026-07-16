## Goal

Now that `USAJOBS_API_KEY` is saved, actually run the fetcher against the real API and prove the coverage gap is closed — per project rule "test the actual behavior, not the status code."

## Steps

1. **Trigger a refresh with `usajobs` enabled.** Either call the existing refresh server function directly, or hit it via the Discover UI's refresh path. No new code — the adapter, registration, and default-enabled flag already shipped last turn.

2. **Query the live table and report actual numbers**, matching the baseline shape the owner used:
   - Total `usajobs` rows inserted.
   - Southeast count: `region in ('NC','SC','GA','TN','VA','FL')`.
   - Per-metro breakdown for the previously-zero cities: Greensboro, Winston-Salem, Charlotte, Raleigh, Durham, Atlanta.
   - `usajobs` rows with `salary_max` populated (vs. pool-wide 17.9%).
   - Combined new pool total and new Southeast %.

3. **If the fetcher errors** (401, rate limit, User-Agent rejected, empty results): say so plainly with the actual error, do not report a fake success. Fix and re-run.

4. **Typecheck**: `bunx tsgo --noEmit` — must stay at zero output.

5. **Publish** and confirm the deploy is live (not just committed).

6. **Changelog entry** already drafted last turn — confirm it's present, published, and honestly worded (government roles specifically, real geographic coverage). Adjust wording if the numbers we just measured contradict the draft.

## Out of scope

No changes to tailor/cover-letter, Discover UI beyond what shipped, or `jobs.functions.ts` business logic. No new sources. No touching the in-flight changelog mechanism itself.
