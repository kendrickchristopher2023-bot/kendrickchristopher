import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyResume } from "@/lib/resume.functions";
import { listMatches } from "@/lib/matches.functions";
import { listApplications } from "@/lib/applications.functions";
import { ResumeOnboarding } from "@/components/ResumeOnboarding";

export const Route = createFileRoute("/_authenticated/apply/")({
  head: () => ({
    meta: [
      { title: "Home — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Your private application kit." },
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

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function ApplyPage() {
  const getFn = useServerFn(getMyResume);
  const matchesFn = useServerFn(listMatches);
  const appsFn = useServerFn(listApplications);
  const qc = useQueryClient();

  const resumeQ = useQuery({ queryKey: ["my-resume"], queryFn: () => getFn({ data: {} }) });
  const matchesQ = useQuery({ queryKey: ["matches"], queryFn: () => matchesFn(), enabled: !!resumeQ.data?.resume });
  const appsQ = useQuery({ queryKey: ["applications"], queryFn: () => appsFn(), enabled: !!resumeQ.data?.resume });

  const loading = resumeQ.isLoading;
  const hasResume = !!resumeQ.data?.resume;

  const appliedKeys = new Set(
    (appsQ.data ?? []).map((a) => `${norm(a.company)}::${norm(a.role)}`),
  );
  const unapplied = (matchesQ.data ?? []).filter(
    (m) => !appliedKeys.has(`${norm(m.company)}::${norm(m.role)}`),
  );
  const next = unapplied[0];

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Home
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            What's next?
          </h1>
        </header>

        {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

        {/* No resume: single obvious action */}
        {!loading && !hasResume && (
          <section className="mt-10">
            <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Start here
              </p>
              <h2
                className="mt-2 text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Add your resume
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything else — tailored resumes, cover letters, interview prep — reads from
                this one document. Takes under a minute.
              </p>
              <div className="mt-5">
                <ResumeOnboarding
                  onSaved={() => qc.invalidateQueries({ queryKey: ["my-resume"] })}
                />
              </div>
            </div>
          </section>
        )}

        {/* Has resume + un-applied match: hero action */}
        {!loading && hasResume && next && (
          <section className="mt-10">
            <Link
              to="/apply/go"
              search={{ matchId: next.id }}
              className="block rounded-lg border-2 border-primary/40 bg-primary/5 p-6 hover:border-primary/70 transition-colors"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Next action
              </p>
              <h2
                className="mt-2 text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Apply to {next.company} — {next.role}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                One screen: tailored resume + cover letter, downloads, and log-as-applied.
              </p>
              <p className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Open →
              </p>
            </Link>
            {unapplied.length > 1 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Or{" "}
                <Link to="/apply/matches" className="text-primary hover:underline">
                  pick another ({unapplied.length - 1} more saved)
                </Link>
                .
              </p>
            )}
          </section>
        )}

        {/* Has resume, no matches: send them to Find Jobs */}
        {!loading && hasResume && matchesQ.data && matchesQ.data.length === 0 && (
          <section className="mt-10">
            <Link
              to="/apply/discover"
              className="block rounded-lg border-2 border-primary/40 bg-primary/5 p-6 hover:border-primary/70 transition-colors"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Next action
              </p>
              <h2
                className="mt-2 text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Find jobs to apply to
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Live openings from company career pages. Save the ones you like — they'll show
                up here as your next action.
              </p>
              <p className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Browse jobs →
              </p>
            </Link>
          </section>
        )}

        {/* Has resume, all matches applied to */}
        {!loading && hasResume && (matchesQ.data ?? []).length > 0 && !next && (
          <section className="mt-10">
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                All caught up
              </p>
              <h2
                className="mt-2 text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                You've applied to every saved job
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Nice work.{" "}
                <Link to="/apply/discover" className="text-primary hover:underline">
                  Find more jobs
                </Link>{" "}
                to keep going.
              </p>
            </div>
          </section>
        )}

        {/* Quiet secondary row */}
        {!loading && hasResume && (
          <section className="mt-10 border-t border-border pt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Other tools
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link to="/apply/tailor" className="text-primary hover:underline">
                Tailor to any job description
              </Link>
              <Link to="/apply/interview-prep" className="text-primary hover:underline">
                Interview prep
              </Link>
              <Link to="/apply/autofill" className="text-primary hover:underline">
                Application autofill answers
              </Link>
              <Link to="/apply/referrals" className="text-primary hover:underline">
                Referral DM
              </Link>
              <Link to="/apply/metrics" className="text-primary hover:underline">
                Funnel metrics
              </Link>
            </div>
          </section>
        )}

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          Not indexed. Private application kit.
        </footer>
      </div>
    </main>
  );
}
