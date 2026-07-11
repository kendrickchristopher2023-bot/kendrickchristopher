import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Christopher Kendrick — AI Deployment & Enablement Manager" },
      {
        name: "description",
        content:
          "Online resume of Christopher Kendrick, an AI deployment and customer enablement specialist.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1
        className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Christopher Kendrick
      </h1>
      <p className="mt-4 text-xl sm:text-2xl font-medium text-primary">
        AI Deployment & Enablement Manager
      </p>
      <p className="mt-4 max-w-lg text-base text-muted-foreground">
        Results-driven AI enablement specialist with 10+ years of experience
        accelerating enterprise product adoption and building AI automation
        solutions.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/resume"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View resume
        </Link>
        <a
          href="/Christopher_Kendrick_Resume.pdf"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
        >
          Download PDF
        </a>
      </div>
    </div>
  );
}
