// Plain-text help content shared with the in-app chat assistant so its
// answers don't drift from the /help/faq and /help/getting-started pages.
// The pages keep their own rich JSX; keep the wording here in sync.

export const GETTING_STARTED_STEPS: { title: string; body: string }[] = [
  { title: "Sign in", body: "You'll need an invite from whoever runs this instance." },
  { title: "Add your resume", body: "Paste your resume or LinkedIn text when prompted; review the structured version it creates and fix anything that's off." },
  { title: "Find a job you want", body: "Paste the posting's description into Tailor (/apply/tailor)." },
  { title: "Review the tailored output", body: "Check the tailored resume, cover letter, and match score. Everything is editable before you copy or download it." },
  { title: "Apply on the company's site yourself", body: "Nothing is ever auto-submitted. Log it as Applied in /apply/matches so the tool can track it and remind you to follow up." },
  { title: "Use the browser extension", body: "Fills your name, contact info, and saved screener answers into the company's application form. You still review and submit yourself." },
  { title: "Check Interview Prep once you land an interview", body: "Generate Situation → Task → Action → Result stories from your real experience at /apply/interview-prep." },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "What is this?", a: "A personal AI job-search toolkit: one resume, tailored automatically to any job, plus cover letters, interview prep, screener autofill, and an application tracker." },
  { q: "How do I get started?", a: "Sign in, then paste your existing resume or LinkedIn About text — the tool turns it into your structured profile automatically. Full walk-through at /help/getting-started." },
  { q: "How does resume tailoring work?", a: "Paste a job description at /apply/tailor; the tool rewrites your summary and bullets to match that role's language, using only what's already true in your resume. It never invents experience. You can edit the output before copying or downloading." },
  { q: "Will this get past resume-screening software?", a: "It formats your resume as real, selectable text with standard section headings — what most screening software needs to read it correctly. It shows matched/missing keywords so you know your real experience is represented. It does not try to trick any screening system — that tends to get caught and backfires." },
  { q: "Does it apply to jobs for me?", a: "No. It prepares everything but you always review and submit each application yourself. Nothing is auto-submitted anywhere, ever." },
  { q: "What's the browser extension for?", a: "It fills your name, contact details, and saved answers on a job application page so you don't have to retype them. You still review and click submit yourself." },
  { q: "Can I have more than one resume?", a: "Yes — keep multiple named resumes at /resumes and choose which is primary." },
  { q: "Is there a daily limit?", a: "Yes, to keep costs sane. Free accounts get a modest number of AI actions per day; paid plans get more. Current usage is shown in /settings." },
  { q: "Is my data private?", a: "Yes. Your resume and application data are visible only to you." },
  { q: "What if I get stuck?", a: "Ask the chat assistant (bottom corner) or check /help/faq." },
];

export const RECENT_CHANGES: string[] = [
  "The landing page (/) is the product page. Christopher's personal portfolio moved to /christopher.",
  "Tailored resumes, cover letters, and screener answers are editable before you copy or download them.",
  "Application Autofill (/apply/autofill) has two modes: leave company/role empty for generic reusable answers (saved to your profile and used by the browser extension), or fill them in for targeted answers grounded in a specific job — targeted answers don't overwrite the reusable set.",
  "Some job postings contain instructions aimed at applicants (hidden codes, 'include this word', etc.). The app now surfaces those as a notice instead of copying them into your letter or answers.",
  "You can export your applications and matches to CSV from /apply/matches and /apply/metrics.",
  "USAJOBS and SmartRecruiters are live in the job pool; US state names are normalized to 2-letter codes so regional filters work correctly.",
  "There's a sister product for event planning: The Kenroe Collective™ (thekenroecollective.com), linked from the landing page.",
];

export const ROUTE_MAP: string[] = [
  "/ — landing page (signed-out product page)",
  "/christopher — the owner's personal portfolio",
  "/auth — sign in",
  "/apply — your application kit hub",
  "/apply/tailor — tailor resume + cover letter to a job description",
  "/apply/autofill — generate screener answers (generic or targeted)",
  "/apply/matches — private tracker of jobs you're targeting; CSV export",
  "/apply/interview-prep — STAR-format interview stories",
  "/apply/referrals — warm LinkedIn referral DMs",
  "/apply/metrics — application funnel stats; CSV export",
  "/apply/rewrite — one-shot resume rewrite",
  "/apply/discover — browse the shared job pool",
  "/apply/go — quick-generate flow from a match",
  "/resume — your primary structured resume",
  "/resumes — manage multiple named resumes",
  "/settings — plan, usage, notifications, screener answers",
  "/whats-new — changelog",
  "/help/getting-started — 7-step walk-through",
  "/help/faq — plain-language FAQ",
];

export function helpContentAsPrompt(): string {
  const steps = GETTING_STARTED_STEPS.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join("\n");
  const faq = FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
  const changes = RECENT_CHANGES.map((c) => `- ${c}`).join("\n");
  const routes = ROUTE_MAP.map((r) => `- ${r}`).join("\n");
  return `\n\nGETTING STARTED (7 steps):\n${steps}\n\nFAQ:\n${faq}\n\nRECENT CHANGES (last two weeks — the model must not describe the old behavior):\n${changes}\n\nROUTE MAP:\n${routes}`;
}
