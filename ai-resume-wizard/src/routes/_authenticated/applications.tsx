import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listTailorSessions, getTailorSession } from "@/lib/applications.functions";
import { getMyResume } from "@/lib/resume.functions";
import { downloadTailoredResume, downloadCoverLetterFile } from "@/lib/tailor-download";
import { downloadTextFile } from "@/components/DownloadButtons";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — history and re-downloads" },
      {
        name: "description",
        content:
          "Re-open every resume you have tailored, along with the job description you pasted, and download them again.",
      },
      { property: "og:title", content: "My Applications — history and re-downloads" },
      {
        property: "og:description",
        content: "Your saved tailored resumes, job descriptions, and cover letters in one place.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ApplicationsHistoryPage,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function ApplicationsHistoryPage() {
  const listFn = useServerFn(listTailorSessions);
  const resumeFn = useServerFn(getMyResume);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const sessionsQ = useQuery({
    queryKey: ["tailor-sessions"],
    queryFn: () => listFn(),
  });
  const resumeQ = useQuery({
    queryKey: ["my-resume"],
    queryFn: () => resumeFn({ data: {} }),
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = sessionsQ.data ?? [];
    if (!needle) return rows;
    return rows.filter((r) =>
      `${r.company ?? ""} ${r.role ?? ""}`.toLowerCase().includes(needle),
    );
  }, [sessionsQ.data, q]);

  const groups = useMemo(() => {
    const out: { label: string; rows: typeof filtered }[] = [];
    for (const r of filtered) {
      const label = monthLabel(r.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(r);
      else out.push({ label, rows: [r] });
    }
    return out;
  }, [filtered]);

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            History
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            My Applications
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Everything you have tailored, newest first. Open any one to read the job description you
            pasted and download the resume or cover letter again.
          </p>
        </header>

        <div className="mt-6">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by company or role"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {sessionsQ.isLoading && (
          <p className="mt-6 text-sm text-muted-foreground">Loading your history…</p>
        )}
        {sessionsQ.error && (
          <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {sessionsQ.error instanceof Error ? sessionsQ.error.message : "Failed to load."}
          </p>
        )}
        {!sessionsQ.isLoading && filtered.length === 0 && (
          <p className="mt-6 rounded-md border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
            {sessionsQ.data && sessionsQ.data.length > 0
              ? "Nothing matches that search."
              : "You have not tailored a resume yet. Once you do, it shows up here."}
          </p>
        )}

        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h2>
              <ul className="space-y-2">
                {g.rows.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setOpenId((v) => (v === r.id ? null : r.id))}
                      aria-expanded={openId === r.id}
                      className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-accent/40"
                    >
                      <span className="font-medium text-foreground">
                        {r.company || "No company saved"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {r.role || "No role saved"}
                      </span>
                      <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                        {r.match_score !== null && (
                          <span className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 font-semibold text-primary">
                            Match {r.match_score}/100
                          </span>
                        )}
                        {formatDate(r.created_at)}
                      </span>
                    </button>
                    {openId === r.id && (
                      <SessionDetail
                        id={r.id}
                        resume={resumeQ.data?.resume ?? null}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function SessionDetail({
  id,
  resume,
}: {
  id: string;
  resume: import("@/lib/resume-data").MasterResume | null;
}) {
  const detailFn = useServerFn(getTailorSession);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["tailor-session", id],
    queryFn: () => detailFn({ data: { id } }),
  });

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  if (q.isLoading) {
    return <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground">Loading…</p>;
  }
  if (q.error || !q.data) {
    return (
      <p className="border-t border-border px-4 py-4 text-sm text-destructive">
        {q.error instanceof Error ? q.error.message : "This saved item could not be opened."}
      </p>
    );
  }

  const d = q.data;
  const company = d.company ?? "";
  const role = d.role ?? "";

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr(null);
    try {
      if (!resume) throw new Error("No master resume found. Add yours on My Resume first.");
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5 border-t border-border px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("resume-pdf", () =>
              downloadTailoredResume({
                kind: "pdf",
                resume: resume!,
                summary: d.summary,
                bullets: d.bullets,
                company,
                role,
              }),
            )
          }
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {busy === "resume-pdf" ? "Preparing…" : "Download tailored resume (PDF)"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            run("resume-docx", () =>
              downloadTailoredResume({
                kind: "docx",
                resume: resume!,
                summary: d.summary,
                bullets: d.bullets,
                company,
                role,
              }),
            )
          }
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {busy === "resume-docx" ? "Preparing…" : "Resume (Word)"}
        </button>
        {d.cover_letter && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              run("cl-pdf", () =>
                downloadCoverLetterFile({
                  kind: "pdf",
                  resume: resume!,
                  coverLetter: d.cover_letter ?? "",
                  company,
                  role,
                }),
              )
            }
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
          >
            {busy === "cl-pdf" ? "Preparing…" : "Download cover letter (PDF)"}
          </button>
        )}
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}

      {(d.matched_keywords.length > 0 || d.missing_keywords.length > 0) && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-background p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold text-foreground">Matched keywords</p>
            <p className="mt-1 text-muted-foreground">{d.matched_keywords.join(", ") || "None"}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Missing keywords</p>
            <p className="mt-1 text-muted-foreground">{d.missing_keywords.join(", ") || "None"}</p>
          </div>
        </div>
      )}

      <Panel
        title="Job description you pasted"
        actions={
          <>
            <button
              type="button"
              onClick={() => copy("jd", d.jd_text ?? "")}
              className="text-xs font-medium text-primary hover:underline"
            >
              {copied === "jd" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `${company || "Job"}_${role || "description"}`,
                  d.jd_text ?? "",
                )
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              Download as .txt
            </button>
          </>
        }
      >
        {d.jd_text ? (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-foreground font-sans">
            {d.jd_text}
          </pre>
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No job description was saved with this one.
          </p>
        )}
      </Panel>

      {d.summary && (
        <Panel
          title="Tailored summary"
          actions={
            <button
              type="button"
              onClick={() => copy("summary", d.summary)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {copied === "summary" ? "Copied" : "Copy"}
            </button>
          }
        >
          <p className="px-4 py-3 text-sm leading-relaxed text-foreground">{d.summary}</p>
        </Panel>
      )}

      {d.bullets.length > 0 && (
        <Panel title="Tailored bullets by role">
          <div className="space-y-4 px-4 py-3">
            {d.bullets.map((b, i) => (
              <div key={`${b.company}|${b.title ?? ""}|${i}`}>
                <p className="text-sm font-semibold text-foreground">
                  {[b.title, b.company].filter(Boolean).join(" at ") || "Role"}
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
                  {b.bullets.map((x, j) => (
                    <li key={j}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {d.cover_letter && (
        <Panel
          title="Cover letter"
          actions={
            <button
              type="button"
              onClick={() => copy("cl", d.cover_letter ?? "")}
              className="text-xs font-medium text-primary hover:underline"
            >
              {copied === "cl" ? "Copied" : "Copy"}
            </button>
          }
        >
          <pre className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-foreground font-sans">
            {d.cover_letter}
          </pre>
        </Panel>
      )}
    </div>
  );
}

function Panel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <div className="flex items-center gap-3">{actions}</div>
      </div>
      {children}
    </div>
  );
}
