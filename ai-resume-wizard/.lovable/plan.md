# v3: GitHub presence, funnel metrics, and clarifications

## Answering your questions first

### What "Loom walkthroughs" means
Loom is a free screen-recording tool (loom.com). A "walkthrough" = a 60–90 second video where you share your screen and narrate: "Here's the reservation converter I built at Mews. Client sends me this messy CSV → I paste it here → click convert → out comes a Mews-ready file. Saves onboarding managers ~2 hours per hotel."

Why it matters for AI jobs: recruiters at OpenAI/Anthropic/Lovable scan hundreds of resumes. A resume says "I built X." A Loom **proves** it in 60 seconds. It's the single highest-signal artifact you can attach — more than GitHub, more than a portfolio site. I can't record it for you (needs your voice + screen), but I'll add a **"Watch demo"** slot on each project card that shows a play-button when you paste a Loom URL, and hides cleanly when empty. You record 3 Looms this weekend (converter, SF→Slack agent, handover generator), paste URLs into `src/lib/resume-data.ts`, done.

### What "Phase-2 auto-scraper" means
Right now `/apply/matches` is a **static** curated list — I hand-typed ~30 openings. It goes stale the moment a role closes. Phase-2 = a scheduled server job (runs daily via pg_cron on Lovable Cloud) that:
1. Hits each target company's careers page (OpenAI, Anthropic, Lovable, etc.)
2. Parses the current openings
3. Scores each against your resume with Lovable AI ("how well does this JD match Christopher's experience? 0–100")
4. Writes results to a `job_matches` table
5. `/apply/matches` reads live data + shows a "new since yesterday" badge

Result: you open the page each morning and see fresh, ranked, personalized matches. Zero manual curation. It's ~4x the work of v1 (needs Cloud schema, scraper edge function, scheduler, scoring prompt, dedupe logic). My recommendation: **defer until after you've used the current app for 2 weeks and confirmed the tailor flow is landing interviews.** No point automating a step that isn't working manually yet. If you want it sooner, say so and I'll build it.

## What I'll build this pass

### 1. GitHub presence + resume link
- Add `github` field to `src/lib/resume-data.ts` (default: `github.com/christopherkendrick` — tell me the real handle if different)
- Show GitHub link in resume page header, PDF header, and homepage hero — alongside email/phone/location
- Add GitHub icon-link in the site footer

### 2. GitHub project cleanup — READMEs I'll draft
I can't push to GitHub for you (needs your credentials), but I'll write 3 clean, recruiter-ready `README.md` files you paste into new public repos:
- `reservation-file-converter/README.md` — problem, before/after example (with fake hotel data), stack, how to run, screenshot slot
- `salesforce-slack-reporter/README.md` — same shape, sanitized
- `ai-handover-generator/README.md` — same shape

Each README has a "🎥 Watch 60s demo" line where you paste your Loom URL later. I'll drop them in `docs/github-readmes/` in this project so you can copy-paste into fresh repos.

### 3. Loom slot on project cards
- Add optional `loomUrl` field to each project in `resume-data.ts`
- Project cards on `/` and `/resume` show a "▶ Watch demo (60s)" pill when a URL exists, hidden when empty
- No code change needed later — you just paste URLs into `resume-data.ts` after recording

### 4. Funnel metrics dashboard (`/apply/metrics`)
Track your own job hunt as a funnel. Requires **Lovable Cloud** for persistence.

New table `applications`: company, role, jd_url, applied_at, referral_source, resume_version, response_at, response_type (rejected / screen / no-response), interview_stages (jsonb), offer_at, notes.

New route `/apply/metrics`:
- **Log application** form (auto-fills from your last tailor session — company/role pre-populated)
- **Funnel chart**: Applied → Response → Screen → Onsite → Offer, with conversion % between each stage
- **Weekly pace**: applications/week, target line at 10/week
- **By source**: cold apply vs referral vs recruiter-inbound (referrals should convert 5–10x — this will make the case for you to lean into `/apply/referrals`)
- **By company tier**: frontier labs vs applied AI vs consulting — see where you're actually getting traction
- Simple table view + CSV export

This turns job hunting from vibes into a system. In 2 weeks you'll know: "cold apps convert at 2%, referrals at 30%, so stop cold applying and only send tailored asks."

### 5. Won't do this pass (my recommendation)
- **Phase-2 auto-scraper** — deferred until manual flow proves out (see above)
- **Actual Loom recordings** — you do this, I can't
- **Actual GitHub pushes** — you do this, I'll give you the READMEs

## Order of operations
1. Add `github` + `loomUrl` fields to resume-data + wire into UI/PDF
2. Draft 3 project READMEs in `docs/github-readmes/`
3. Enable Lovable Cloud (already enabled from last pass — verify)
4. Migration: `applications` table + RLS + grants
5. Server fns: `logApplication`, `updateApplication`, `listApplications`
6. Build `/apply/metrics` route with funnel chart + log form + table
7. Add `/apply/metrics` link to `/apply` index
8. QA every page

## Thoughts on your overall approach
You're doing the right things in the right order. The remaining bottleneck isn't tooling — it's **volume of tailored applications × referral warmth**. Once metrics are in, we'll know within 2 weeks whether the play is (a) crank cold apps to 15/week, or (b) go all-in on referral DMs. My bet is (b), but data will decide.

One thing you're still missing that I'd flag: **a LinkedIn post cadence**. Recruiters at Lovable/Cursor/Anthropic actively DM builders who post about shipping with Claude/Lovable. Your Mews-internal builds are exactly the content they want to see (sanitized). Say the word and I'll draft 4 weeks of posts as `docs/linkedin-posts.md` in the next pass.

Reply **go** and I'll start.
