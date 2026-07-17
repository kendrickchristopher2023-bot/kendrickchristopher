import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Client-side session sniff so signed-in users redirect straight to /apply
// without a flash. SSR / signed-out visitors render the landing normally.
function hasClientSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!hasClientSession()) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/apply" });
  },
  head: () => ({
    meta: [
      { title: "Application Kit — Land the job, on your terms" },
      {
        name: "description",
        content:
          "Application Kit helps you find real job openings, tailor your resume and cover letter to each one, and keep track of every application. Invite-only.",
      },
      { property: "og:title", content: "Application Kit — Land the job, on your terms" },
      {
        property: "og:description",
        content:
          "Find real job openings, tailor your resume and cover letter to each one, and track every application in one calm workspace. Invite-only.",
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
  component: Landing,
});

const PILLARS = [
  {
    title: "Find real openings",
    body: "A curated feed of live listings from public job boards, refreshed daily. Filter by location, remote, and salary — no ghost jobs, no marketing fluff.",
  },
  {
    title: "Tailor in one click",
    body: "Paste a job description. Get a resume rewritten to speak that role's language and a cover letter drafted from your real experience — never fabricated.",
  },
  {
    title: "Track every application",
    body: "One place to log what you applied to, what came back, and what's next. No spreadsheets. Interview prep and follow-up drafts included.",
  },
];

function Landing() {
  // Server always renders the landing (hidden=false). If a signed-in user
  // slips past beforeLoad (typical SSR case with no client cookies yet), we
  // hide+redirect after mount. Reading localStorage in the initial state
  // caused an SSR/CSR hydration mismatch — do it in useEffect instead.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!hasClientSession()) return;
    setHidden(true);
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (data.user) window.location.replace("/apply");
      else setHidden(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden) return <main className="min-h-screen bg-background" aria-hidden />;

  return (
    <main
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-4xl px-6 py-6 flex items-center justify-between">
        <p
          className="text-sm font-semibold tracking-tight text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Application Kit
        </p>
        <div className="flex items-center gap-4 text-xs">
          <Link to="/request-access" className="text-muted-foreground hover:text-foreground">
            Request access
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-8 sm:pt-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Invite-only · A Kenroe Collective project
        </p>
        <h1
          className="mt-5 text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Land the job,
          <br />
          on your terms.
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-foreground">
          Application Kit helps you find real job openings, tailor your resume and
          cover letter to each one, and track every application — in one calm
          workspace.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          It prepares your materials. It does not auto-apply, submit forms on your
          behalf, or try to trick screening software. You stay in the driver's seat.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            to="/request-access"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Request access
          </Link>
          <span className="text-xs text-muted-foreground">Access is admin-approved.</span>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 mt-16 border-t border-border pt-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          What's inside
        </h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-lg border border-border bg-card p-5">
              <h3
                className="text-base font-semibold text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 mt-16 border-t border-border pt-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Honest about what it is
        </h2>
        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-foreground">
          <li>
            <span className="font-semibold">Human in the loop.</span> Nothing submits
            without you. "Mark as applied" only logs what you already did.
          </li>
          <li>
            <span className="font-semibold">Truthful tailoring.</span> Rewrites rephrase
            your real experience — they never invent employers, titles, or metrics.
          </li>
          <li>
            <span className="font-semibold">No dark patterns.</span> No hidden keywords,
            no CAPTCHA bypass, no tricks aimed at applicant tracking systems.
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-3xl px-6 mt-16">
        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Also from The Kenroe Collective<sup className="ml-0.5 text-[0.7em] font-normal align-super tracking-normal">™</sup>
          </p>
          <h2
            className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            The art of gathering, refined.
          </h2>
          <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-muted-foreground">
            An event platform for weddings, celebrations, and corporate gatherings —
            invitations, guest lists, RSVPs, payments, and communications, with
            AI-assisted menu and design curation.
          </p>
          <a
            href="https://thekenroecollective.com"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Visit The Kenroe Collective →
          </a>
        </div>
      </section>



      <footer className="mx-auto max-w-3xl px-6 mt-20 border-t border-border pt-6 pb-10 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <span>
          <Link to="/legal" className="hover:text-foreground hover:underline">
            Terms &amp; Privacy
          </Link>
          {" · "}
          <Link to="/help/getting-started" className="hover:text-foreground hover:underline">
            Getting started
          </Link>
          {" · "}
          <Link to="/help/faq" className="hover:text-foreground hover:underline">
            FAQ
          </Link>
        </span>
        <span>
          Built by{" "}
          <Link to="/christopher" className="hover:text-foreground hover:underline">
            Christopher Kendrick
          </Link>
        </span>
      </footer>
    </main>
  );
}
