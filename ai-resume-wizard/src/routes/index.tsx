import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Christopher Kendrick — AI Deployment & Enablement Manager" },
      {
        name: "description",
        content:
          "AI deployment and customer enablement specialist with 10+ years accelerating enterprise product adoption. Hands-on builder with Claude, Lovable, and ChatGPT.",
      },
      { property: "og:title", content: "Christopher Kendrick — AI Deployment & Enablement Manager" },
      {
        property: "og:description",
        content:
          "AI deployment and customer enablement specialist with 10+ years accelerating enterprise product adoption.",
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
  component: Index,
});

const WINS = [
  { metric: "60%", label: "Reduction in training time (5 days → 2)" },
  { metric: "50%", label: "Reduction in implementation time (2 mo → 1 mo)" },
  { metric: "10–20", label: "Enterprise accounts managed concurrently" },
];

function Index() {
  const [copied, setCopied] = useState(false);
  const email = "kendrickchristopher@hotmail.com";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <main
      className="min-h-screen bg-background px-6 py-16 sm:py-24"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Portfolio · 2026
        </p>
        <h1
          className="mt-4 text-5xl sm:text-6xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Christopher Kendrick
        </h1>
        <p className="mt-3 text-xl sm:text-2xl font-medium text-primary">
          AI Deployment & Enablement Manager
        </p>
        <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-foreground">
          I help enterprise teams put AI into production — from onboarding
          playbooks to Claude and Lovable-powered automations that replace
          manual work. 10+ years translating complex technical capabilities
          into measurable adoption.
        </p>

        {/* CTA row */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/resume"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            View resume
          </Link>
          <a
            href="/Christopher_Kendrick_Resume.pdf"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Download PDF
          </a>
          <button
            type="button"
            onClick={copyEmail}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {copied ? "Email copied ✓" : "Copy email"}
          </button>
          <Link
            to="/apply"
            className="inline-flex items-center justify-center rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Application kit →
          </Link>
        </div>

        {/* Selected wins */}
        <section className="mt-16 border-t border-border pt-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Selected wins
          </h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {WINS.map((w) => (
              <div key={w.metric}>
                <p
                  className="text-4xl font-bold text-foreground"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {w.metric}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {w.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Focus */}
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Currently exploring
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground">
            AI Deployment Manager · Forward Deployed Engineer · Solutions
            Architect · Implementation Manager · Customer Engineer roles at
            frontier AI companies. Open to relocation to New York.
          </p>
        </section>

        <footer className="mt-16 text-xs text-muted-foreground">
          Concord, NC · {email} · (404) 358-0626
        </footer>
      </div>
    </main>
  );
}
