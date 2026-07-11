import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/apply/autofill")({
  head: () => ({
    meta: [
      { title: "Application Autofill — Christopher Kendrick" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: AutofillPage,
});

const QA: { q: string; a: string }[] = [
  {
    q: "Why {{Company}}?",
    a: `{{Company}} is one of the few places building frontier AI where the deployment work — not just the model — decides whether enterprise customers get value. I've spent 10+ years in that seam: onboarding, enablement, integration, and the change management that decides whether a product actually gets used. I want to do that at the frontier and I've been shipping Claude + Lovable automations at Mews as proof I can build, not just advise.`,
  },
  {
    q: "Why are you leaving your current role?",
    a: `Mews has been a great place to run enterprise onboarding and start shipping AI automation, but the AI work I'm doing is tangential to Mews' core product. I want to work somewhere the frontier model IS the product — where deployment and enablement are the roadmap, not a side project.`,
  },
  {
    q: "Salary expectations",
    a: `Targeting $180k–$220k base for a Deployment / Forward Deployed / Solutions role, plus equity, with flexibility for the right team. Open to conversation — total comp and equity philosophy matter more to me than the base number in isolation.`,
  },
  {
    q: "Are you authorized to work in the United States?",
    a: `Yes — US citizen. No sponsorship required, now or in the future.`,
  },
  {
    q: "Willing to relocate?",
    a: `Yes. Currently in Concord, NC and actively planning a move to New York for the right role. Can be on the ground within 4–6 weeks of an offer.`,
  },
  {
    q: "Notice period?",
    a: `Standard two weeks. Can start within 3–4 weeks of accepting an offer.`,
  },
  {
    q: "Preferred start date?",
    a: `Flexible — 3 to 6 weeks from offer, whichever works best for the team's onboarding cadence.`,
  },
  {
    q: "Tell us about a time you shipped something with AI",
    a: `At Mews, our Onboarding Managers were manually reformatting reservation files for every new enterprise hotel — hours per go-live and error-prone. I built a Lovable + Claude web tool that ingests any format and outputs Mews-ready CSV in one click, iterated with the onboarding team as design partners, and rolled it out across the team. The manual step is gone, and I have a repeatable pattern I've since used for two more internal automations (a Salesforce-to-Slack reporting agent and a handover generator).`,
  },
  {
    q: "How do you translate technical capabilities to non-technical stakeholders?",
    a: `I start from their KPI, not the feature list. In discovery I ask what an executive gets measured on this quarter, then map the product's capability to that number in one sentence they'd say themselves. I use short live demos with their real data instead of generic screenshots, and I follow up in writing so they can forward my summary internally. That written follow-up is where most adoption actually happens — it becomes their internal pitch, not mine.`,
  },
  {
    q: "Describe a time you handled ambiguity",
    a: `When I started at Mews, "successful onboarding" was defined differently by every manager. I wrote a proposal to standardize the definition, workflows, and checkpoints, ran it past leadership and the onboarding team, iterated for two weeks, then rolled it out. Onboarding time dropped 20% and — more importantly — we could finally compare account health across the team.`,
  },
  {
    q: "Why should we hire you over other candidates?",
    a: `Most candidates for this role are either enterprise onboarding people who don't build, or engineers who don't know how to sit in a Fortune 500 rollout meeting. I'm both. I've run 10–20 concurrent enterprise deployments and I ship internal AI automations that replace hours of manual work. That combination is what "AI deployment" actually asks for, and it's rare.`,
  },
  {
    q: "What's your take on shipping to enterprise vs SMB?",
    a: `Enterprise deployment is 20% product, 80% change management, and enablement is the multiplier. SMB rewards speed and self-serve; enterprise rewards trust, executive translation, and building the internal champion who owns adoption after you leave. I'm strongest on the enterprise side but I've done both, and I like designing for the handoff — the moment the customer's team can run without me.`,
  },
];

function AutofillPage() {
  const [company, setCompany] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fill = (text: string) => text.replaceAll("{{Company}}", company || "{{Company}}");

  const copy = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(fill(text));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Application Autofill
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Screener answers, ready to paste.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The 12 questions every AI company asks in their application form.
            Type the company name once — Copy substitutes it into every answer.
          </p>
        </header>

        <div className="mt-8">
          <input
            type="text"
            placeholder="Company name (e.g. Anthropic)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-8 space-y-4">
          {QA.map((item, i) => (
            <div key={i} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <p className="text-sm font-semibold text-foreground">{fill(item.q)}</p>
                <button
                  onClick={() => copy(i, item.a)}
                  className="text-xs font-medium text-primary hover:underline shrink-0 ml-3"
                >
                  {copiedIdx === i ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground">
                {fill(item.a)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
