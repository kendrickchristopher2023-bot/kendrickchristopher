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

type Star = { title: string; competency: string; body: string };

const STAR_STORIES: Star[] = [
  {
    title: "Reservation File Converter (Mews)",
    competency: "Technical build · AI automation",
    body: "S/T: Onboarding managers were manually reformatting reservation files for every new hotel — hours per go-live, high error rate. A: Built a Lovable + Claude web tool that ingests any format and outputs Mews-ready CSV in one click; iterated with the onboarding team as design partners. R: Manual step eliminated; hours-to-days of effort saved per implementation and adopted across the team.",
  },
  {
    title: "Onboarding Redesign (Mews)",
    competency: "Enterprise onboarding · KPI impact",
    body: "S/T: Onboarding was inconsistent across managers; ramp times varied and clients churned early. A: Standardized workflows, wrote user manuals and best-practice guides, and built structured checkpoints across the 2–4 week cycle. R: 20% reduction in onboarding time and improved self-service adoption while running 10–20 accounts concurrently.",
  },
  {
    title: "Training Curriculum Rebuild (PurpleCloud)",
    competency: "Instructional design · Measurable adoption lift",
    body: "S/T: 5-day training program was too long, hurting deal velocity and CSAT. A: Rebuilt curriculum from scratch — cut redundancies, moved reference material to on-demand, redesigned delivery for live + recorded formats. R: Training time cut 60% (5 → 2 days) and implementation time cut 50% (2 mo → 1 mo).",
  },
  {
    title: "Salesforce-to-Slack Reporting Agent (Mews)",
    competency: "Cross-functional delivery · Executive visibility",
    body: "S/T: Leadership had no live visibility into concurrent enterprise deployments. A: Built a Claude-powered reporting tool that pulls Salesforce state daily and posts a structured status digest to Slack. R: Increased management visibility and team accountability without adding meetings.",
  },
  {
    title: "Handover Automation (Mews)",
    competency: "Ambiguity · Operational resilience",
    body: "S/T: Planned absences risked disrupting active enterprise deployments. A: Built a Claude + Lovable automation that generates management-ready handover reports from account data on demand. R: Zero disruption during PTO across active accounts.",
  },
  {
    title: "C-Suite Enablement (PurpleCloud)",
    competency: "Executive stakeholder engagement · Translation",
    body: "S/T: Executive buyers needed to see business value, not feature tours. A: Ran discovery on each exec's KPIs, tailored sessions to connect product capabilities to their objectives, followed up with a written value summary. R: Faster adoption sign-off and stronger renewal posture.",
  },
  {
    title: "Amadeus Top Performer (2017)",
    competency: "Grit · Volume · Customer obsession",
    body: "S/T: North America Hotel SalesPro support queue was overwhelmed. A: Worked the second-highest case volume company-wide while running RCAs on repeat issues and pushing fixes upstream. R: Named Top Performer 2017; reduced repeat ticket categories.",
  },
  {
    title: "Systems Migrations (Amadeus)",
    competency: "Change management · Minimal disruption",
    body: "S/T: Legacy-to-new-platform transitions across enterprise environments. A: Owned migration planning, comms, training, and rollback plans; sequenced cutover by risk tier. R: Delivered with minimal business disruption.",
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
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <button
          type="button"
          onClick={copy}
          className="text-xs font-medium text-primary hover:underline"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground font-sans">
        {text}
      </pre>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2
        className="text-2xl font-bold tracking-tight text-foreground"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ApplyPage() {
  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back home
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            Private
          </span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Application Kit
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Everything you need to apply.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Copy-paste ready: cover letters, LinkedIn copy, STAR stories, and a
            target-company list. Tuned for AI Deployment / Forward Deployed /
            Customer Engineering roles at frontier AI companies.
          </p>
        </header>

        <Section title="Cover letters">
          <CopyBlock
            label="General (edit the {{placeholders}})"
            text={COVER_LETTER_GENERAL}
          />
          <CopyBlock label="OpenAI-specific" text={COVER_LETTER_OPENAI} />
        </Section>

        <Section title="LinkedIn">
          <CopyBlock label='"About" section' text={LINKEDIN_ABOUT} />
          <div className="mt-4 rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Headline options (3)
              </p>
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
          <div className="space-y-4">
            {STAR_STORIES.map((s) => (
              <div key={s.title} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {s.title}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {s.competency}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Target companies">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Company
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Roles to search
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TARGET_COMPANIES.map((c) => (
                  <tr key={c.company}>
                    <td className="px-4 py-2 font-medium text-foreground">
                      {c.company}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{c.roles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tracker CSV:{" "}
            <a
              href="/application_tracker.csv"
              className="text-primary hover:underline"
            >
              application_tracker.csv
            </a>
          </p>
        </Section>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          Not indexed. Only reachable via /apply.
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
