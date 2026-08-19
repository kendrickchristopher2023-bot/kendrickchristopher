# Add "what to include" box to Resume Rewrite

Today the Rewrite page only reshapes what's already in your saved resume. This adds a free-text box where you can paste raw notes, rough bullet points, or instructions ("add my AI projects portfolio", "emphasize enablement", "drop the 2015 retail job"), and the rewrite folds that material into the resume in polished, resume-ready wording.

## What you'll see

On `/apply/rewrite`, above the "Rewrite my resume" button:

- **A large paste box** — "Anything you want added or changed?" with helper text: paste raw notes, project lists, or plain instructions. No formatting needed.
- **A placement picker** (defaults to "Let AI decide"):
  - Let AI decide
  - Add as a new Projects / Portfolio section
  - Fold into my current roles' bullets
  - Instructions only (don't add new content)
- Everything stays optional — leaving the box empty produces exactly today's behavior.

The generated draft is still reviewed and edited by you before saving, and new content shows up in the existing per-field editors. New project entries will render in their own review block alongside the summary and role bullets.

## How the AI handles it

The extra text is treated as your own truthful material, so it can be rewritten into resume phrasing — but the existing no-fabrication rules still hold:

- Never invent numbers, dates, employers, titles, or outcomes that aren't in what you pasted.
- Blocked/in-progress items stay labeled as such ("in progress", "paused") rather than being written up as shipped.
- Where an item clearly needs a metric you haven't supplied, it's written without one — no invented "saved 30 minutes".
- Pasted text is treated as content, not as commands to the system (existing prompt-safety handling).

## Technical notes

- `src/lib/rewrite.functions.ts`: add an `inputValidator` to `generateResumeRewrite` accepting `{ notes?: string (max ~8000 chars), placement?: "auto" | "projects" | "experience" | "instructions_only" }`. Append a clearly delimited `USER-SUPPLIED ADDITIONS` block plus placement rule to the prompt; extend `SYSTEM` with the truthfulness guardrails above. Entitlement/usage logic unchanged.
- `src/routes/_authenticated/apply.rewrite.tsx`: textarea + placement radio group in the "Ready to rewrite" card, passed through `runFn({ data: { notes, placement } })`; add review/edit blocks for `projects[]` (title, stack, outcome) and `competencies` so newly added items are editable before save.
- Save path (`saveRewrittenResume`) is unchanged — the draft already round-trips the full `MasterResume` shape.
- Verify with `bunx tsgo --noEmit` (zero output) and an end-to-end run pasting the AI-projects text, confirming the projects land in the saved resume and downstream PDF/DOCX export.
- Changelog entry (category `improved`): "Tell the resume rewrite what to add."
