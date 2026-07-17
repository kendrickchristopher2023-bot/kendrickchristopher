import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RESUME } from "@/lib/resume-data";
import { useSession, signOut } from "@/lib/session";

export const Route = createFileRoute("/christopher")({
  head: () => ({
    meta: [
      { title: "Christopher Kendrick — AI Deployment & Enablement Manager" },
      {
        name: "description",
        content:
          "AI deployment and customer enablement specialist. 10+ years accelerating enterprise product adoption. Hands-on builder with Claude, Lovable, and ChatGPT.",
      },
      { property: "og:title", content: "Christopher Kendrick — AI Deployment & Enablement Manager" },
      {
        property: "og:description",
        content:
          "AI deployment and customer enablement specialist. 10+ years accelerating enterprise product adoption. Hands-on builder with Claude, Lovable, and ChatGPT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: Portfolio,
});

const WINS = [
  { metric: "60%", label: "Reduction in training time (5 days → 2)" },
  { metric: "50%", label: "Reduction in implementation time (2 mo → 1 mo)" },
  { metric: "10–20", label: "Enterprise accounts managed concurrently" },
];

function Portfolio() {
  const [copied, setCopied] = useState(false);
  const email = RESUME.email;
  const { user } = useSession();

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent(
    "Introduction — Christopher Kendrick",
  )}&body=${encodeURIComponent("Hi Christopher,\n\n")}`;


  return (
    <main className="min-h-screen bg-background px-6 py-16 sm:py-24" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Portfolio · 2026 · A Kenroe Collective<sup className="ml-0.5 text-[0.6em] font-normal align-super">™</sup> project
          </p>
          {user ? (
            <div className="flex items-center gap-3 text-xs">
              <Link to="/apply" className="font-medium text-primary hover:underline">
                Open kit →
              </Link>
              <button onClick={signOut} className="text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/auth" className="text-xs font-medium text-primary hover:underline">
              Sign in →
            </Link>
          )}
        </div>

        <h1 className="mt-4 text-5xl sm:text-6xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {RESUME.name}
        </h1>
        <p className="mt-3 text-xl sm:text-2xl font-medium text-primary">{RESUME.title}</p>
        <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-foreground">
          I help enterprise teams put AI into production — from onboarding playbooks
          to Claude and Lovable-powered automations that replace manual work. 10+
          years translating complex technical capabilities into measurable adoption.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link to="/resume" className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            View resume
          </Link>
          <a href="/Christopher_Kendrick_Resume.pdf" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Download PDF
          </a>
          <a href={mailtoHref} className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Email me
          </a>
          <button type="button" onClick={copyEmail} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {copied ? "copied ✓" : "or copy email"}
          </button>
          <Link to="/apply" className="inline-flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Application kit →
          </Link>
        </div>

        {/* Selected wins */}
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Selected wins</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {WINS.map((w) => (
              <div key={w.metric}>
                <p className="text-4xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {w.metric}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Projects</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RESUME.projects.map((p) => {
              const linkHref = p.href ?? p.repoUrl;
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">
                      {p.title === "The Kenroe Collective" ? (
                        <>The Kenroe Collective<sup className="ml-0.5 text-[0.6em] font-normal align-super">™</sup></>
                      ) : (
                        p.title
                      )}
                    </h3>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                      {p.stack}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.outcome}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                    {p.loomUrl && (
                      <a href={p.loomUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        ▶ Demo (60s)
                      </a>
                    )}
                    {p.repoUrl && (
                      <a href={p.repoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        GitHub
                      </a>
                    )}
                    {p.href && <span className="text-primary">Visit →</span>}
                    {p.internal && <span className="text-muted-foreground">You're looking at it.</span>}
                  </div>
                </>
              );
              return linkHref && !p.repoUrl ? (
                <a key={p.title} href={linkHref} target="_blank" rel="noreferrer" className="group rounded-lg border border-border bg-card p-5 hover:border-primary/60 transition-colors">
                  {inner}
                </a>
              ) : (
                <div key={p.title} className="rounded-lg border border-border bg-card p-5 hover:border-primary/60 transition-colors">
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* Focus */}
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Currently exploring</h2>
          <p className="mt-4 text-base leading-relaxed text-foreground">
            AI Deployment Manager · Forward Deployed Engineer · Solutions Architect ·
            Implementation Manager · Customer Engineer roles at frontier AI companies.
            Open to relocation to New York.
          </p>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          Concord, NC · {email} · {RESUME.phone} ·{" "}
          <a href={`https://${RESUME.github}`} target="_blank" rel="noreferrer" className="hover:text-primary">{RESUME.github}</a>
          <br />
          <span className="mt-2 inline-block">
            <Link to="/help/getting-started" className="text-primary hover:underline">Getting started</Link>
            {" · "}
            <Link to="/help/faq" className="text-primary hover:underline">FAQ</Link>
            {" · "}
            <Link to="/legal" className="text-primary hover:underline">Terms &amp; Privacy</Link>
            {" · "}
            Built by <a href="https://thekenroecollective.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">The Kenroe Collective<sup className="ml-0.5 text-[0.6em] font-normal align-super">™</sup></a> · Last updated {RESUME.lastUpdated}
          </span>
        </footer>
      </div>
    </main>
  );
}
