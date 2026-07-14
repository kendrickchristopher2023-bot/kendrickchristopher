import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/help/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — AI Job Kit" },
      {
        name: "description",
        content:
          "Answers to common questions about the AI job-search toolkit: how tailoring works, resume-screening software, privacy, limits, and more.",
      },
      { property: "og:title", content: "FAQ — AI Job Kit" },
      {
        property: "og:description",
        content:
          "Plain-language answers about how the tool tailors resumes, works with resume-screening software, and keeps your data private.",
      },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: FaqPage,
});

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is this?",
    a: "A personal AI job-search toolkit: one resume, tailored automatically to any job, plus cover letters, interview prep, and an application tracker.",
  },
  {
    q: "How do I get started?",
    a: (
      <>
        Sign in, then paste your existing resume or LinkedIn "About" text — the tool turns it
        into your structured profile automatically. See the{" "}
        <Link to="/help/getting-started" className="text-primary hover:underline">
          Getting Started guide
        </Link>{" "}
        for the full walk-through.
      </>
    ),
  },
  {
    q: "How does resume tailoring work?",
    a: "Paste a job description; the tool rewrites your summary and bullet points to match that role's language, using only what's already true in your resume. It never invents experience.",
  },
  {
    q: "Will this get past resume-screening software?",
    a: "It formats your resume as real, selectable text with standard section headings — not images or complex layouts — which is what most screening software needs to read it correctly. It shows which keywords from the job description are matched or missing so you know your real experience is represented. It does not try to trick or manipulate any screening system — that kind of manipulation tends to get caught and backfires.",
  },
  {
    q: "Does it apply to jobs for me?",
    a: "No. It prepares everything — tailored resume, cover letter, application answers — but you always review and submit each application yourself. Nothing is auto-submitted anywhere, ever.",
  },
  {
    q: "What's the browser extension for?",
    a: "It fills in your name, contact details, and saved answers on a job application page so you don't have to retype them. You still review the page and click submit yourself.",
  },
  {
    q: "Can I have more than one resume?",
    a: "Yes — keep multiple named resumes (e.g. for different types of roles) and choose which one is used by default.",
  },
  {
    q: "Is there a daily limit?",
    a: "Yes, to keep costs sane. Free accounts get a modest number of AI actions per day; paid plans get more. Current usage is shown in Settings.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your resume and application data are visible only to you.",
  },
  {
    q: "What if I get stuck?",
    a: "Ask the chat assistant (bottom corner) or re-check this page.",
  },
];

function FaqPage() {
  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Help
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Frequently asked questions
          </h1>
        </header>

        <dl className="mt-10 space-y-8">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-lg font-semibold text-foreground">{q}</dt>
              <dd className="mt-2 text-base leading-relaxed text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>

        <footer className="mt-16 border-t border-border pt-6 text-sm">
          <Link to="/help/getting-started" className="text-primary hover:underline">
            Getting started →
          </Link>
        </footer>
      </div>
    </main>
  );
}
