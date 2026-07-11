# Finish the AI Resume + Application Kit

The resume is already built in all 3 formats:
- Web page at `/resume`
- `public/Christopher_Kendrick_Resume.pdf`
- `public/Christopher_Kendrick_Resume.docx`
- Both files also in `/mnt/documents/` for direct download

## What I'll finish this pass

1. **Visual QA the PDF** — render each page to an image and check for overflow, cramped spacing, orphan headings, and confirm it holds to exactly 2 pages on US Letter.
2. **Polish the web `/resume` page**
   - Add a print stylesheet so `Cmd/Ctrl+P` produces a clean 2-page print identical to the PDF (hide download bar, tighten margins).
   - Add a subtle "last updated" line and a copy-email button.
   - Confirm semantic tokens (no hardcoded colors) and mobile layout.
3. **Home page (`/`)** — make it a proper mini portfolio landing:
   - One-line positioning statement targeting AI Deployment / Forward Deployed / Customer Engineering roles.
   - Buttons: View Resume · Download PDF · Email · LinkedIn.
   - Quick "Selected wins" strip (3 metrics from the resume).

## Application kit (the "anything else you need")

Add a new route `/apply` (not linked from nav, just for you) containing copy‑paste ready assets tuned for OpenAI-style AI companies (OpenAI, Anthropic, Lovable, Cursor, Perplexity, Sierra, Decagon):

1. **Tailored cover letter template** — one general + one OpenAI-specific version, editable placeholders for `{{Company}}` / `{{Role}}`.
2. **LinkedIn "About" rewrite** — 3–4 short paragraphs positioning you as AI Deployment / Forward Deployed Engineer-adjacent.
3. **LinkedIn headline options** (3 variants under 220 chars).
4. **Short-form intro** — 2‑sentence pitch for recruiter DMs / "Tell me about yourself".
5. **Interview prep sheet** — 6–8 STAR stories mapped to competencies AI-deployment roles screen for (customer enablement, technical translation, cross-functional delivery, measurable adoption lift, ambiguity, executive comms).
6. **Target company list** with role titles to search (AI Deployment Manager, Forward Deployed Engineer, Solutions Architect, Implementation Manager, Customer Engineer, GTM Engineer).
7. **Application tracker CSV** dropped in `/mnt/documents/` so you can log outreach.

Each block has a one-click "Copy" button.

## Won't do unless you ask

- No changes to resume content/wording (already approved).
- No auth, no database — everything static.
- Won't publish the site; say the word and I'll deploy.

## Technical notes

- Print CSS via a `@media print` block in `src/styles.css` scoped to `/resume`.
- `/apply` route follows existing TanStack file-based routing pattern (`src/routes/apply.tsx`), own `head()` with `noindex` so it isn't crawled.
- Cover letter + LinkedIn copy stored as plain string constants in the route file — no backend needed.
