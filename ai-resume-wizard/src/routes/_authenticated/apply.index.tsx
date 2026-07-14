import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyResume, type MasterResume } from "@/lib/resume.functions";
import { ResumeOnboarding } from "@/components/ResumeOnboarding";

export const Route = createFileRoute("/_authenticated/apply/")({
  head: () => ({
    meta: [
      { title: "Application Kit" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Your private application kit — tailored resume, cover letters, and referral tools." },
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

const TOOLS = [
  {
    to: "/apply/tailor" as const,
    title: "AI Resume Tailor",
    desc: "Paste a job description, get a role-specific resume + cover letter + downloadable PDF/DOCX.",
    badge: "AI-powered",
  },
  {
    to: "/apply/matches" as const,
    title: "Job Matches",
    desc: "Track roles you're targeting. One click to tailor for each.",
    badge: "Tracker",
  },
  {
    to: "/apply/autofill" as const,
    title: "Application Autofill",
    desc: "Copy-paste answers to the screener questions every company asks.",
    badge: "Questions",
  },
  {
    to: "/apply/referrals" as const,
    title: "Referral DM Generator",
    desc: "Name + company → personalized LinkedIn DM. Warm intros beat cold apps.",
    badge: "AI-powered",
  },
  {
    to: "/apply/interview-prep" as const,
    title: "Interview Prep (Situation → Task → Action → Result)",
    desc: "Structured-story answers built from your real experience for a target job description.",
    badge: "AI-powered",
  },
  {
    to: "/apply/metrics" as const,
    title: "Funnel Metrics",
    desc: "Log every application. See conversion applied → response → onsite → offer.",
    badge: "Tracker",
  },
  {
    to: "/resumes" as const,
    title: "Resume Tracks",
    desc: "Manage multiple named master resumes and pick which is primary.",
    badge: "Manage",
  },
  {
    to: "/settings" as const,
    title: "Plan & Usage",
    desc: "See your current tier and today's AI usage against your daily limits.",
    badge: "Account",
  },
];


function ApplyPage() {
  const getFn = useServerFn(getMyResume);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-resume"],
    queryFn: () => getFn({ data: {} }),
  });

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
            AI-powered resume tailoring, cover letters, referral DMs, and interview stories —
            all built from your saved resume.
          </p>
        </header>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading your kit…</p>}

        {!isLoading && !data?.resume && (
          <Section title="Get started">
            <p className="mb-4 text-sm text-muted-foreground">
              Add your resume once. Every tool below reads from it.
            </p>
            <ResumeOnboarding
              onSaved={() => qc.invalidateQueries({ queryKey: ["my-resume"] })}
            />
          </Section>
        )}

        {!isLoading && data?.resume && (
          <>
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

            <DerivedCopy resume={data.resume} />

            <Section title="Manage">
              <Link to="/resume" className="text-sm text-primary hover:underline">
                Edit your resume →
              </Link>
            </Section>
          </>
        )}

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          Not indexed. Private application kit.
        </footer>
      </div>
    </main>
  );
}

function DerivedCopy({ resume: R }: { resume: MasterResume }) {
  const first = R.experience?.[0];
  const topBullets = (first?.bullets ?? []).slice(0, 3);
  const nameFirst = (R.name || "").split(" ")[0] || "there";

  const coverLetter = `Dear {{Hiring Team}},

I'm applying for the {{Role}} position at {{Company}}. ${R.summary || ""}

A few relevant proof points from my recent work${first ? ` at ${first.company}` : ""}:
${topBullets.map((b) => `- ${b}`).join("\n")}

What draws me to {{Company}}: {{one specific sentence about the product, a recent launch, or a customer story}}.

I'd welcome the chance to talk.

Best,
${R.name}${R.email ? `\n${R.email}` : ""}${R.phone ? ` · ${R.phone}` : ""}`;

  const linkedinAbout = `${R.summary || ""}

Recent highlights:
${topBullets.map((b) => `· ${b}`).join("\n")}

${R.email ? `Say hi: ${R.email}` : ""}`.trim();

  const headlines = [
    R.title || "Open to new roles",
    `${R.title || "Professional"} · ${first?.company ? `Ex-${first.company}` : ""} · Open to opportunities`,
    `${nameFirst} — ${R.title || "Open to new roles"} · ${R.competencies?.slice(0, 3).join(" · ") || ""}`,
  ].filter(Boolean);

  const shortPitch = `I'm ${nameFirst}. ${R.summary || ""}`;

  const stars = (R.experience ?? []).slice(0, 3).flatMap((exp) =>
    (exp.bullets ?? []).slice(0, 2).map((b) => ({
      title: `${exp.company} — ${exp.title}`,
      competency: exp.dates,
      body: b,
    })),
  );

  return (
    <>
      <Section title="Cover letter (template)">
        <p className="mb-3 text-xs text-muted-foreground">
          Generated from your saved resume. Edit the {"{{placeholders}}"} per role, or use the
          AI Resume Tailor for a fully role-specific version.
        </p>
        <CopyBlock label="Cover letter" text={coverLetter} />
      </Section>

      <Section title="LinkedIn">
        <CopyBlock label='"About" section' text={linkedinAbout} />
        <div className="mt-4 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Headline options
            </p>
          </div>
          <ul className="divide-y divide-border">
            {headlines.map((h, i) => (
              <li key={i} className="flex items-start justify-between gap-4 px-4 py-3">
                <p className="text-sm leading-relaxed text-foreground">{h}</p>
                <CopyInline text={h} />
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Short-form pitch">
        <CopyBlock label="Recruiter DM / 'Tell me about yourself'" text={shortPitch} />
      </Section>

      {stars.length > 0 && (
        <Section title="Interview story starters">
          <p className="text-sm text-muted-foreground mb-4">
            Seeded from your top bullets. Flesh each one into a structured story
            (Situation → Task → Action → Result) before the interview.
          </p>
          <div className="space-y-4">
            {stars.map((s, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {s.competency}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
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
