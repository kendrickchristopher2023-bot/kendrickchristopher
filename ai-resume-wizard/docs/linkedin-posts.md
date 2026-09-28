# LinkedIn Post Cadence — 4 Weeks

**Goal:** show recruiters at Lovable / Cursor / Anthropic / Charlotte-metro AI teams that you *ship* with AI. Two posts/week. Tuesday 8:30a ET (builders scroll before standup), Thursday 12:15p ET (recruiters on lunch).

Rules of thumb:
- Lead with the outcome, not the tool.
- One visual per post (screenshot, 30s Loom, or before/after).
- End with a soft ask: "What would you build next?" beats "DM me."
- Sanitize anything company-specific (no client names, no internal URLs).

---

## Week 1 — Plant the flag

### Post 1 (Tue) — "Why I'm building in public"
> Spent 3 years turning messy hospitality data into decisions at Mews. Now I'm doing the same thing with AI — starting with a public application kit I built for myself in Lovable this weekend.
>
> It tailors my resume to any JD in ~15 seconds, tracks my application funnel, and drafts referral DMs I'd actually send.
>
> Link in comments. Feedback welcome — especially from folks hiring for Forward Deployed / Solutions roles.
>
> — Christopher, The Kenroe Collective

**Visual:** screenshot of `/apply` index.

### Post 2 (Thu) — Reservation converter walkthrough
> A hotel would send us a 12-column CSV. Mews needed 7, in a different order, with dates reformatted. Ops was doing it by hand — 2 hrs per property.
>
> Built a browser-based converter in an afternoon. Paste → convert → download. Zero training required.
>
> 60-second demo ↓ [Loom]
>
> The pattern (messy input → schema-enforced output → one-click export) generalizes to almost every AI onboarding problem I've seen.

**Visual:** Loom of the converter.

---

## Week 2 — Show the range

### Post 3 (Tue) — Salesforce → Slack agent
> The pipeline review meeting used to eat 45 min every Monday. Someone would open Salesforce, screenshot 6 reports, paste them into Slack, and everyone would ask the same 3 questions.
>
> I wrote an agent that pulls the reports, summarizes the deltas week-over-week, flags anything that moved >20%, and posts it Sunday night. Meeting shrank to 15 min.
>
> Stack: SFDC REST → Claude → Slack webhook. ~180 lines.
>
> Loom ↓

**Visual:** Loom or annotated Slack screenshot.

### Post 4 (Thu) — The lesson, not the tool
> Everyone's writing about which model is best. The actual bottleneck in every AI project I've shipped:
>
> 1. Nobody wrote down the current process before automating it.
> 2. The "80% case" turns out to be 3 different cases in a trench coat.
> 3. The reviewer of the AI output is more expensive than the person it replaced.
>
> Solve those three and model choice becomes a rounding error.

**Visual:** none, or plain text card.

---

## Week 3 — Show the process

### Post 5 (Tue) — Handover generator
> When a CSM leaves, the new one loses 2 weeks re-learning the accounts.
>
> Built a generator: point it at the account's Slack, SFDC notes, and email threads. Out comes a one-pager: relationship status, open risks, decision-makers, last 3 promises made. New CSM ramps in a day.
>
> Loom ↓
>
> Same architecture I used for the reservation converter — schema in, schema out, LLM only handles the fuzzy middle.

**Visual:** Loom of generated handover doc (fake data).

### Post 6 (Thu) — Charlotte AI scene
> Charlotte quietly has one of the deepest AI hiring pipelines in the Southeast — BofA, Lowe's, Honeywell, Duke, LPL, Ally, Red Ventures, AvidXchange all shipping GenAI in production.
>
> If you're a builder here and want to swap notes on what's actually working (retrieval quality, eval loops, human-in-the-loop UX), reply and I'll start a small Signal group.
>
> — Kenroe Collective

**Visual:** simple graphic listing the companies.

---

## Week 4 — Ask for the job

### Post 7 (Tue) — The application kit itself
> I got tired of tailoring resumes by hand, so I built a tool that does it in 15s using Lovable AI.
>
> Paste a JD → get a resume rewritten around it, plus a 3-sentence "why me" I can drop into the cover letter field. It also tracks my funnel and generates referral DMs.
>
> Open-sourcing the READMEs this week. Link in comments.
>
> Fair warning to recruiters: I'm using it on you.

**Visual:** Loom of `/apply/tailor` in action.

### Post 8 (Thu) — Direct ask
> I'm looking for a Forward Deployed / Solutions role at an applied AI company — remote or Charlotte metro.
>
> What I bring: 3 yrs shipping AI-adjacent tooling to non-technical operators, comfort with the "customer sends you a CSV at 11pm and needs it in production by 9am" mode of work, and a portfolio of things I've actually built (linked below).
>
> If your team is hiring and this sounds like the shape, I'd love 20 min. If you know someone, an intro means more than a like.
>
> — Christopher Kendrick | The Kenroe Collective

**Visual:** photo of you + link to `/apply`.

---

## What to measure

Log every post in `/apply/metrics` under source = `linkedin`. After 4 weeks look at:
- Profile views / week (baseline vs each posting week)
- Inbound recruiter DMs (this is the real KPI)
- Referral DMs *you* sent that got a response (posts warm the ground; the DM closes)

If Post 8 gets <3 warm intros, the play isn't "post more" — it's tighten the pitch. Send me the numbers and I'll help iterate.
