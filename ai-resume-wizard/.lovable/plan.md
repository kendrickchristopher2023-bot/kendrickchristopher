# v2: Resume tailor, projects, job matcher, Kenroe flag

Answering your questions in order:

## What "Copy email" does
It copies `kendrickchristopher@hotmail.com` to your clipboard — that's it. I'll upgrade it to **also open a pre‑filled draft** (`mailto:` with subject "Introduction — Christopher Kendrick" and a 2‑line body) so one click gets you 80% into an outreach email.

## What I'll build this pass

### 1. AI Resume Tailor (the highest-leverage thing for speed of getting a job)
Recommendation: **AI-powered rewrite + downloadable tailored PDF**. This is what actually moves the needle — every serious application should be tailored, and doing it by hand is why people apply to 5 jobs/week instead of 25.

New route `/apply/tailor`:
- Big textarea: "Paste the job description"
- Optional inputs: Company name, Role title
- **"Tailor my resume"** button → sends JD + your master resume JSON to Lovable AI (`openai/gpt-5.5`) which returns:
  - Rewritten 2‑sentence summary aimed at that JD
  - Reordered + rewritten bullets emphasizing the skills the JD asks for (no fabrication — only re-weighting real experience)
  - Keyword-match score + missing keywords list (for ATS)
  - Tailored cover letter (uses my existing OpenAI-style template as base)
- **Download tailored PDF** button — regenerates the PDF server-side with the new content
- **Copy tailored resume text** + **Copy cover letter** buttons
- Saves your last 10 tailors to localStorage so you can revisit
- Requires enabling **Lovable Cloud** (for the server function that calls the AI + generates the PDF). I'll flag this before doing it.

### 2. STAR stories rewrite — action & result first
You're right, they read defensive. I'll flip all 8 to lead with what YOU built, not what was broken. New shape:
- **What I did** (1–2 sentences, active voice, verb-first)
- **Result** (bolded metric)
- **Context** (one line at the end, only if needed)

Example rewrite (Onboarding):
> **Built** a standardized enterprise onboarding playbook — sequenced workflows, written manuals, and structured checkpoints across the 2–4 week cycle. **Result: 20% faster time-to-value across 10–20 concurrent enterprise accounts.** Context: onboarding had been inconsistent between managers, ramp times varied.

### 3. Projects section
Yes — huge yes. Recruiters at AI companies weight "builds things" more than pedigree. I'll add a **Projects** section to:
- `/resume` web page (new section between Experience and Education)
- `/` homepage (visual card grid)
- **Not** the PDF v1 (space is tight); optional PDF v2 later

Projects included (all yours):
- **Reservation File Converter** — Lovable + Claude, eliminated manual migration step at Mews
- **Salesforce → Slack Reporting Agent** — Claude-powered exec visibility
- **AI Handover Generator** — Claude + Lovable, zero-disruption PTO coverage
- **The Kenroe Collective** — your consultancy site
- **This resume site** — self-referential proof: "the site you're reading was built with the tools I'd deploy for your customers"

Each card: title · stack · one-line problem/outcome · link (where public).

### 4. "Apply for AI jobs for me" — the honest answer
Full auto-submit is a bad idea: it violates Greenhouse/Lever/LinkedIn ToS, bans your accounts, and produces low-quality submissions that hurt your brand at the exact companies you want. What actually gets you hired faster is a **job-match dashboard + application autofill helper**, both of which I'll build:

**`/apply/matches` — Job Match Dashboard**
- Static-first (this pass): curated list of ~30 live openings at your target companies (OpenAI, Anthropic, Lovable, Cursor, Perplexity, Sierra, Decagon, Glean, Writer, Hebbia) with title, location, link, and posted date
- Each row: **"Tailor for this role"** button → pipes JD into the Tailor tool with company/role pre-filled → PDF + cover letter in ~15 seconds
- v2 (later, needs Cloud + a scheduled function): auto-scrape these companies' careers pages daily and score each opening against your resume with AI. I'll scope this as Phase 2.

**`/apply/autofill` — Application Autofill Helper**
- Copy-paste ready answers to the 12 screener questions every AI company asks:
  - "Why [company]?" (template with `{{Company}}` slot the tailor tool auto-fills)
  - "Why are you leaving your current role?"
  - "Salary expectations" (with your NC → NYC relocation framing)
  - "Are you authorized to work in the US?"
  - "Willing to relocate?" · "Notice period?" · "Preferred start date?"
  - "Tell us about a time you shipped something with AI"
  - + 4 more
- All copy-buttoned.

### 5. Kenroe Collective — plant the flag
Small footer on every page: "Built by The Kenroe Collective →" linking to your Kenroe project. I'll also add a subtle "About Kenroe" tag under your name on the homepage. **Not** building a full services site this pass — we'll scope that as v3 once the resume + job-match flywheel is proven.

### 6. mailto upgrade + last-updated line
- "Copy email" → **"Email me"** (opens draft) + tiny "copy" secondary action
- "Last updated: Jul 11, 2026" line on `/resume`

## What you're missing (my recommendations)

1. **A GitHub with your projects public.** Ship the reservation converter, SF→Slack agent, and handover generator as public repos with clean READMEs. AI companies check. If they're client-confidential, publish sanitized versions with fake data. I can help draft READMEs.
2. **A loom/video walkthrough** of the reservation converter (60 seconds, screen recording). One link on your resume → recruiters actually see you build. Massive signal.
3. **LinkedIn "Open to work" + weekly 1 post cadence** on what you're building with Claude/Lovable. Recruiters DM builders who post. I can draft 4 weeks of posts as part of the app kit.
4. **A referral ask list.** Warm intros beat cold apps 10:1. I'll add a `/apply/referrals` mini-tool: paste a LinkedIn URL of someone at a target company → generates a personalized DM asking for a referral chat.
5. **Metrics dashboard for your own funnel.** How many applications sent → responses → interviews → offers. Once we enable Cloud, this is trivial and turns job hunting into a system.

I'll build #4 (referral DM generator) this pass since it's cheap and high-leverage. #1, #2, #3, #5 I'll queue up and we can tackle after you validate the tailor flow works for you.

## Order of operations

1. Enable Lovable Cloud (I'll confirm before)
2. Rewrite 8 STAR stories → action-first
3. Build `/apply/tailor` (AI resume + cover letter generator + PDF download)
4. Build `/apply/matches` (curated job list v1)
5. Build `/apply/autofill` (screener answers)
6. Build `/apply/referrals` (DM generator)
7. Projects section on `/` and `/resume`
8. Kenroe footer + homepage tag
9. mailto upgrade + last-updated line
10. QA every page in the preview, verify tailor flow end-to-end with a real JD

## Won't do this pass

- Full mini-business site for Kenroe (you asked to just plant the flag)
- Auto-submitting applications (bad idea — explained above)
- Scheduled JD scraping (Phase 2 after Cloud is proven out)
- Public GitHub cleanup for your projects (I can help but it's outside this app)

Reply **go** and I'll start with enabling Cloud.
