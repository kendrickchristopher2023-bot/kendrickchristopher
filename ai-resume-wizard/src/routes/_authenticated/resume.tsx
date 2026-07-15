import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getMyResume, type MasterResume } from "@/lib/resume.functions";
import { ResumeOnboarding } from "@/components/ResumeOnboarding";
import { AtsLintPanel } from "@/components/AtsLintPanel";
import { lintResumeForAts } from "@/lib/ats-lint";

export const Route = createFileRoute("/_authenticated/resume")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search.id === "string" ? { id: search.id } : {},
  head: () => ({
    meta: [
      { title: "My Resume — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Your resume, structured and ready to tailor." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: ResumePage,
});

function ResumePage() {
  const getFn = useServerFn(getMyResume);
  const qc = useQueryClient();
  const { id } = Route.useSearch();
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-resume", id ?? "primary"],
    queryFn: () => getFn({ data: { id } }),
  });


  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-12">
        <p className="text-sm text-muted-foreground">Loading your resume…</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="min-h-screen bg-background p-12">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load resume."}
        </p>
      </main>
    );
  }

  if (!data?.resume) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
          <h1
            className="mt-6 text-4xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Your resume
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            No resume on file yet. Set one up in under a minute — everything else (tailor,
            cover letters, exports) reads from it.
          </p>
          <ResumeOnboarding
            onSaved={() => qc.invalidateQueries({ queryKey: ["my-resume"] })}
          />
        </div>
      </main>
    );
  }

  return <ResumeView resume={data.resume} />;
}

function ResumeView({ resume: R }: { resume: MasterResume }) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const download = async (kind: "pdf" | "docx") => {
    setErr(null);
    setBusy(kind);
    try {
      const url = kind === "pdf" ? "/api/tailored-resume" : "/api/resume-docx";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: R }),
      });
      if (!res.ok) throw new Error(`${kind.toUpperCase()} export failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${(R.name || "Resume").replace(/[^a-z0-9]/gi, "_")}_Resume.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => download("pdf")}
              disabled={busy !== null}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy === "pdf" ? "Building…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => download("docx")}
              disabled={busy !== null}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
            >
              {busy === "docx" ? "Building…" : "Download DOCX"}
            </button>
            <Link
              to="/apply/tailor"
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            >
              Tailor to a job description →
            </Link>
          </div>
        </div>

        {err && (
          <p className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}

        <div className="mb-6">
          <AtsLintPanel findings={useMemo(() => lintResumeForAts(R), [R])} />
        </div>


        <article className="bg-card text-card-foreground rounded-xl border border-border p-8 sm:p-12 shadow-sm">
          <header className="border-b border-border pb-6 mb-8">
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {R.name || "Your Name"}
            </h1>
            {R.title && (
              <p className="mt-2 text-xl sm:text-2xl font-medium text-primary">{R.title}</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {[R.email, R.phone, R.location, R.github, R.linkedin]
                .filter(Boolean)
                .join("  •  ")}
            </p>
          </header>

          {R.summary && (
            <Section title="Summary">
              <p className="text-base leading-relaxed text-foreground">{R.summary}</p>
            </Section>
          )}

          {R.competencies?.length > 0 && (
            <Section title="Skills">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm text-foreground">
                {R.competencies.map((c) => (
                  <div key={c} className="flex items-start gap-2">
                    <span className="text-primary">▸</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {R.experience?.length > 0 && (
            <Section title="Experience">
              {R.experience.map((role) => (
                <div key={`${role.company}-${role.title}`} className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                    <h3 className="text-lg font-semibold text-foreground">{role.title}</h3>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {role.dates}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-primary mb-3">
                    {[role.company, role.location].filter(Boolean).join(" | ")}
                  </p>
                  <ul className="space-y-2 text-sm leading-relaxed text-foreground list-disc list-inside">
                    {role.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>
              ))}
            </Section>
          )}

          {R.additionalExperience?.length > 0 && (
            <Section title="Additional Experience">
              <ul className="space-y-1 text-sm text-foreground list-disc list-inside">
                {R.additionalExperience.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </Section>
          )}

          {R.proficiencies?.length > 0 && (
            <Section title="Technical Proficiencies">
              <div className="space-y-3 text-sm text-foreground">
                {R.proficiencies.map((p) => (
                  <p key={p.label}>
                    <strong className="text-primary">{p.label}:</strong> {p.value}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {(R.education?.degree || R.education?.school) && (
            <Section title="Education">
              <div className="text-sm text-foreground">
                {R.education.degree && <p className="font-semibold">{R.education.degree}</p>}
                {R.education.school && <p className="text-muted-foreground">{R.education.school}</p>}
              </div>
            </Section>
          )}

          {R.certifications?.length > 0 && (
            <Section title="Certifications">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-foreground">
                {R.certifications.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            </Section>
          )}
        </article>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {R.lastUpdated && <span>Last updated {R.lastUpdated}</span>}
          <Link to="/resume" search={{}} className="text-primary hover:underline">
            Manage
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}
