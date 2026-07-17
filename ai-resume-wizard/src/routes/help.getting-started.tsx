import { createFileRoute, Link } from "@tanstack/react-router";
import { HelpTabs } from "@/components/HelpTabs";

export const Route = createFileRoute("/help/getting-started")({
  head: () => ({
    meta: [
      { title: "Getting Started — AI Job Kit" },
      {
        name: "description",
        content:
          "Step-by-step: sign in, save your resume, tailor to a job description, apply, and prep for interviews.",
      },
      { property: "og:title", content: "Getting Started — AI Job Kit" },
      {
        property: "og:description",
        content:
          "A short walk-through of how to use the AI job-search toolkit end-to-end.",
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
  component: GettingStartedPage,
});

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Sign in",
    body: "You'll need an invite from whoever runs this instance.",
  },
  {
    title: "Add your resume",
    body: "Paste your resume or LinkedIn text when prompted; review the structured version it creates and fix anything that's off.",
  },
  {
    title: "Find a job you want",
    body: 'Paste the posting\'s description into "Tailor."',
  },
  {
    title: "Review the tailored output",
    body: "Check the tailored resume, cover letter, and match score; download the file or copy the text.",
  },
  {
    title: "Apply on the company's site yourself",
    body: 'Log it as "Applied" so the tool can track it and remind you to follow up.',
  },
  {
    title: "Use the browser extension",
    body: "Speeds up filling out the application form. You still review and submit yourself.",
  },
  {
    title: "Check Interview Prep once you land an interview",
    body: "Generate structured stories (Situation → Task → Action → Result) from your real experience.",
  },
];

function GettingStartedPage() {
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
            Getting started
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            The whole flow, end-to-end, in seven steps.
          </p>
        </header>

        <ol className="mt-10 space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {i + 1}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/apply"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open my application kit
          </Link>
          <Link
            to="/help/faq"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Read the FAQ
          </Link>
        </div>
      </div>
    </main>
  );
}
