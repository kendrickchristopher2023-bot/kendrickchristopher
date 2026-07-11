import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/apply")({
  head: () => ({
    meta: [
      { title: "Application Kit — Christopher Kendrick" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Private application kit." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: ApplyPage,
});

const COVER_LETTER_GENERAL = `Dear {{Hiring Team}},

I'm applying for the {{Role}} position at {{Company}}. I spend my days doing the exact work this role is built around: getting enterprise customers to real, measured value with new software — and, over the past two years, with AI specifically.

At Mews I redesigned onboarding to cut time-to-value by 20% while running 10–20 enterprise accounts in parallel. When the tooling didn't exist, I built it: a Lovable + Claude reservation-file converter that eliminated a manual migration step; a Salesforce-to-Slack reporting agent that gives leadership live account status; a Claude-powered handover generator that keeps deployments moving during PTO. Before that, at PurpleCloud, I cut training time 60% (5 days → 2) and implementation time 50% by rebuilding the enablement curriculum end-to-end.

What draws me to {{Company}}: {{one specific sentence about the product, a recent launch, or a customer story}}. Your customers need someone who can sit with a technical team in the morning, translate the roadmap to a CRO in the afternoon, and ship a working automation that night. That's the job I've been doing.

I'd welcome the chance to talk.

Best,
Christopher Kendrick
kendrickchristopher@hotmail.com · (404) 358-0626`;

const COVER_LETTER_OPENAI = `Dear OpenAI Hiring Team,

I'm applying for the AI Deployment Manager role. Deploying frontier models into large organizations is a translation problem, a change-management problem, and a build problem in one — and it's the work I've been doing for a decade, most recently with Claude and Lovable at Mews.

A few relevant proof points:
- Built a Lovable + Claude reservation-file converter that eliminated a manual data migration step for every new enterprise hotel we onboard.
- Shipped a Salesforce-to-Slack reporting agent (Claude) that gives leadership real-time visibility into 10–20 concurrent enterprise deployments.
- Cut onboarding time 20% at Mews and, earlier at PurpleCloud, cut training time 60% and implementation time 50% by rebuilding curriculum and delivery.
- Guide C-suite stakeholders through adoption weekly — connecting product capabilities to business objectives in language they act on.

I want to do this for ChatGPT Enterprise and the API customers pushing GPT into the core of their operations. I'm based in NC, ready to relocate to NYC, and available on your timeline.

Best,
Christopher Kendrick
kendrickchristopher@hotmail.com · (404) 358-0626`;

const LINKEDIN_ABOUT = `I help enterprise teams turn new software — and now frontier AI — into measured business outcomes.

For 10+ years I've owned the messy middle of enterprise software: onboarding, enablement, integration, and the change management that decides whether a product actually gets used. Today I do that work with a Claude and Lovable toolbelt, shipping internal automations that replace hours of manual work per deployment.

Recent wins:
· Built an AI-powered reservation file converter (Lovable + Claude) that automated a manual migration step at Mews.
· Cut onboarding time 20% at Mews across 10–20 concurrent enterprise accounts.
· Cut training time 60% and implementation time 50% at PurpleCloud through curriculum and process redesign.
· Deliver executive enablement — translating technical roadmaps into business language C-suite stakeholders can act on.

I'm exploring AI Deployment / Forward Deployed / Customer Engineering roles at frontier AI companies. Open to relocating to New York. Say hi: kendrickchristopher@hotmail.com`;

const HEADLINES = [
  "AI Deployment & Enablement Manager · Shipping Claude + Lovable automations for enterprise customers · Open to NYC",
  "Turning frontier AI into enterprise adoption · 10+ years in onboarding, enablement, and technical implementation",
  "AI Deployment Manager · Ex-Mews, PurpleCloud, Amadeus · Building with Claude & Lovable · Open to relocation",
];

const SHORT_PITCH = `I'm Christopher — I've spent 10+ years getting enterprise customers to real value with new software, and the last two shipping Claude and Lovable automations that replace manual work at Mews. Looking for AI Deployment / Forward Deployed roles at a frontier AI company, open to relocating to NYC.`;

type Star = { title: string; competency: string; action: string; result: string; context: string };

// Rewritten action-first: what I did leads, result is bolded, context is a
// one-liner at the end.
const STAR_STORIES: Star[] = [
  {
    title: "Reservation File Converter (Mews)",
    competency: "Technical build · AI automation",
    action:
      "Designed and shipped a Lovable + Claude web tool that ingests any reservation-file format and outputs Mews-ready CSV in one click. Ran the onboarding team as design partners through three iterations and rolled it out across implementations.",
    result:
      "Eliminated a manual migration step from every enterprise hotel go-live — hours to days of saved effort per implementation, adopted team-wide.",
    context: "Previously the reformat was manual per hotel, hours per go-live and error-prone.",
  },
  {
    title: "Onboarding Redesign (Mews)",
    competency: "Enterprise onboarding · KPI impact",
    action:
      "Rebuilt the enterprise onboarding program end-to-end: standardized workflows, wrote user manuals and best-practice guides, and installed structured checkpoints across the 2–4 week cycle.",
    result:
      "20% reduction in onboarding time while running 10–20 concurrent enterprise accounts, and materially better self-service adoption downstream.",
    context: "Onboarding had been ad-hoc, varying by manager.",
  },
  {
    title: "Training Curriculum Rebuild (PurpleCloud)",
    competency: "Instructional design · Measurable adoption lift",
    action:
      "Rewrote the customer training curriculum from scratch — cut redundancies, moved reference material to on-demand, and redesigned delivery for a hybrid live + recorded format.",
    result:
      "Training time cut 60% (5 days → 2) and implementation time cut 50% (2 months → 1 month), directly accelerating deal-to-live velocity.",
    context: "The legacy 5-day program was hurting velocity and CSAT.",
  },
  {
    title: "Salesforce → Slack Reporting Agent (Mews)",
    competency: "Cross-functional delivery · Executive visibility",
    action:
      "Built a Claude-powered reporting agent that pulls Salesforce state daily and posts a structured account-status digest to leadership Slack.",
    result:
      "Gave management live visibility into every enterprise deployment with zero added meetings, and raised team accountability by making status public and repeatable.",
    context: "Leadership had no rolling view across 10–20 concurrent enterprise deployments.",
  },
  {
    title: "PTO Handover Automation (Mews)",
    competency: "Operational resilience · Build",
    action:
      "Built a Claude + Lovable automation that generates management-ready handover reports from account data on demand. Rolled it out to the onboarding team as a self-serve tool.",
    result:
      "Zero deployment disruption across active accounts during planned absences — the tool now covers every managed handover.",
    context: "Planned absences had been a recurring risk to active enterprise deployments.",
  },
  {
    title: "C-Suite Enablement (PurpleCloud)",
    competency: "Executive engagement · Translation",
    action:
      "Ran executive discovery on each buyer's quarterly KPIs, then designed tailored sessions that mapped product capabilities directly to those metrics. Followed every session with a written value summary the exec could forward internally.",
    result:
      "Faster adoption sign-off and a stronger renewal posture — the written summaries became the exec's internal pitch, not mine.",
    context: "Feature-tour demos were failing to move exec buyers.",
  },
  {
    title: "Top Performer, North America (Amadeus, 2017)",
    competency: "Grit · Volume · Customer obsession",
    action:
      "Worked the second-highest support case volume company-wide while running root-cause analyses on repeat issues and pushing durable fixes upstream to engineering.",
    result:
      "Named Top Performer 2017; measurably reduced the top repeat-ticket categories the following quarters.",
    context: "The Hotel SalesPro NA support queue was overwhelmed.",
  },
  {
    title: "Legacy → Modern Platform Migrations (Amadeus)",
    competency: "Change management · Minimal disruption",
    action:
      "Owned end-to-end enterprise migration plans — sequencing, comms, training, rollback — and led cutovers tiered by risk so critical accounts moved with a safety net.",
    result:
      "Delivered every migration on-plan with minimal customer disruption; no rollbacks triggered on the accounts I owned.",
    context: "Complex enterprise environments moving from legacy to new platform.",
  },
];

const TARGET_COMPANIES = [
  { company: "OpenAI", roles: "AI Deployment Manager, Forward Deployed Engineer, Solutions Architect" },
  { company: "Anthropic", roles: "Applied AI, Solutions Architect, Customer Engineer" },
  { company: "Lovable", roles: "Forward Deployed Engineer, Solutions, Customer Engineer" },
  { company: "Cursor", roles: "Forward Deployed Engineer, Solutions" },
  { company: "Perplexity", roles: "Enterprise Solutions, Customer Success Engineering" },
  { company: "Sierra", roles: "Agent Engineer, Forward Deployed" },
  { company: "Decagon", roles: "Forward Deployed Engineer, Implementation" },
  { company: "Glean", roles: "Solutions Engineer, Customer Engineer" },
  { company: "Writer", roles: "AI Solutions Architect, Deployment" },
  { company: "Hebbia", roles: "Forward Deployed, Solutions" },
];

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mt-4 rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <button type="button" onClick={copy} className="text-xs font-medium text-primary hover:underline">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground font-sans">{text}</pre>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const TOOLS = [
  {
    to: "/apply/tailor" as const,
    title: "AI Resume Tailor",
    desc: "Paste a JD, get a role-specific resume + cover letter + downloadable PDF in ~15 seconds.",
    badge: "AI-powered",
  },
  {
    to: "/apply/matches" as const,
    title: "Job Matches",
    desc: "Curated live openings at 30 frontier AI companies. One click to tailor for each.",
    badge: "30 openings",
  },
  {
    to: "/apply/autofill" as const,
    title: "Application Autofill",
    desc: "Copy-paste answers to the 12 screener questions every AI company asks.",
    badge: "12 questions",
  },
  {
    to: "/apply/referrals" as const,
    title: "Referral DM Generator",
    desc: "Name + company → personalized LinkedIn DM asking for a 15-min chat. Warm intros beat cold apps.",
    badge: "AI-powered",
  },
];

function ApplyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">Private</span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Application Kit</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Everything you need to apply.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Four AI-powered tools + copy-paste content. Tuned for AI Deployment / Forward
            Deployed / Customer Engineering roles at frontier AI companies.
          </p>
        </header>

        <Section title="Tools">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TOOLS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="group rounded-lg border border-border bg-card p-5 hover:border-primary/60 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary">{t.title}</h3>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.badge}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
                <p className="mt-3 text-xs font-medium text-primary">Open →</p>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="Cover letters">
          <CopyBlock label="General (edit the {{placeholders}})" text={COVER_LETTER_GENERAL} />
          <CopyBlock label="OpenAI-specific" text={COVER_LETTER_OPENAI} />
        </Section>

        <Section title="LinkedIn">
          <CopyBlock label='"About" section' text={LINKEDIN_ABOUT} />
          <div className="mt-4 rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Headline options (3)</p>
            </div>
            <ul className="divide-y divide-border">
              {HEADLINES.map((h, i) => (
                <li key={i} className="flex items-start justify-between gap-4 px-4 py-3">
                  <p className="text-sm leading-relaxed text-foreground">{h}</p>
                  <CopyInline text={h} />
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Short-form pitch">
          <CopyBlock label="Recruiter DM / 'Tell me about yourself'" text={SHORT_PITCH} />
        </Section>

        <Section title="STAR interview stories">
          <p className="text-sm text-muted-foreground mb-4">
            Action leads. Result is the point. Context is one line at the end, only if needed.
          </p>
          <div className="space-y-4">
            {STAR_STORIES.map((s) => (
              <div key={s.title} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">{s.competency}</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  <strong className="text-foreground">What I did.</strong> {s.action}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  <strong className="text-primary">Result.</strong> {s.result}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Context: {s.context}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Target companies">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Company</th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">Roles to search</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TARGET_COMPANIES.map((c) => (
                  <tr key={c.company}>
                    <td className="px-4 py-2 font-medium text-foreground">{c.company}</td>
                    <td className="px-4 py-2 text-muted-foreground">{c.roles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Full dashboard: <Link to="/apply/matches" className="text-primary hover:underline">/apply/matches</Link>. Tracker CSV:{" "}
            <a href="/application_tracker.csv" className="text-primary hover:underline">application_tracker.csv</a>
          </p>
        </Section>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          Not indexed. Built by <a href="https://kenroecollective.com" className="text-primary hover:underline">The Kenroe Collective</a>.
        </footer>
      </div>
    </main>
  );
}

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* ignore */
        }
      }}
      className="shrink-0 text-xs font-medium text-primary hover:underline"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
