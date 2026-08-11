import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { getApplyContext } from "@/lib/matches.functions";
import { getMyResume } from "@/lib/resume.functions";
import { tailorResume, type TailorResult } from "@/lib/tailor.functions";
import { generateReferralDm } from "@/lib/referral.functions";
import { upsertApplication } from "@/lib/applications.functions";
import {
  EditableBlock,
  InjectionNotice,
  TailorModePicker,
  type TailorMode,
} from "@/components/TailorEdit";

// Plain zod (NOT @tanstack/zod-adapter — that dependency broke production once).
const searchSchema = z.object({
  matchId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/apply/go")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Apply — one screen" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: ApplyGoPage,
});

function fmtSalary(s: {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: string | null;
} | null) {
  if (!s) return null;
  if (!s.min && !s.max) return null;
  const cur = s.currency || "USD";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`);
  const range = s.min && s.max ? `${fmt(s.min)}–${fmt(s.max)}` : fmt((s.min || s.max)!);
  const suffix = s.period && s.period !== "year" ? `/${s.period}` : "";
  return `${cur} ${range}${suffix}`;
}

function ApplyGoPage() {
  const { matchId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const ctxFn = useServerFn(getApplyContext);
  const getResume = useServerFn(getMyResume);
  const tailorFn = useServerFn(tailorResume);
  const referralFn = useServerFn(generateReferralDm);
  const upsertAppFn = useServerFn(upsertApplication);

  const ctxQ = useQuery({
    queryKey: ["apply-context", matchId],
    queryFn: () => ctxFn({ data: { matchId: matchId! } }),
    enabled: !!matchId,
  });
  const { data: resumeData } = useQuery({
    queryKey: ["my-resume"],
    queryFn: () => getResume({ data: {} }),
  });

  const ctx = ctxQ.data;
  const company = ctx?.match.company ?? "";
  const role = ctx?.match.role ?? "";

  // Tailor state
  const [jdOverride, setJdOverride] = useState<string>("");
  const effectiveJd = jdOverride.trim().length >= 30
    ? jdOverride
    : (ctx?.jobDescription ?? "");
  const [jdExpanded, setJdExpanded] = useState(false);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorErr, setTailorErr] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [mode, setMode] = useState<TailorMode>("both");

  // Editable overlays; reset when a new AI result arrives.
  const [editSummary, setEditSummary] = useState("");
  const [editCover, setEditCover] = useState("");
  const [editBullets, setEditBullets] = useState<{ company: string; title?: string; bullets: string[] }[]>([]);
  useEffect(() => {
    if (!result) return;
    setEditSummary(result.summary ?? "");
    setEditCover(result.coverLetter ?? "");
    setEditBullets((result.bullets ?? []).map((b) => ({ company: b.company, title: b.title, bullets: [...b.bullets] })));
  }, [result]);

  // Downloads
  const [dl, setDl] = useState<string | null>(null);

  // Referral
  const [refName, setRefName] = useState("");
  const [refDm, setRefDm] = useState("");
  const [refLoading, setRefLoading] = useState(false);
  const [refErr, setRefErr] = useState<string | null>(null);

  // Mark applied
  const [applyStage, setApplyStage] = useState<"applied">("applied");
  const [applySource, setApplySource] = useState<"cold" | "referral" | "recruiter" | "event" | "other">("cold");

  // Reset per-match state when switching matches
  useEffect(() => {
    setResult(null);
    setTailorErr(null);
    setJdOverride("");
    setJdExpanded(false);
    setRefDm("");
    setRefName("");
    setRefErr(null);
  }, [matchId]);

  const onTailor = async () => {
    setTailorErr(null);
    setResult(null);
    if (!effectiveJd || effectiveJd.trim().length < 30) {
      setTailorErr("Need a job description first. Paste one below.");
      return;
    }
    setTailorLoading(true);
    try {
      const r = await tailorFn({
        data: { jobDescription: effectiveJd, company, role, mode },
      });
      setResult(r);
    } catch (e) {
      setTailorErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setTailorLoading(false);
    }
  };

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const download = async (kind: "resume-pdf" | "resume-docx" | "cl-pdf" | "cl-docx") => {
    if (!result || !resumeData?.resume) return;
    setDl(kind);
    try {
      const R = resumeData.resume;
      let url: string;
      let body: unknown;
      let filename: string;
      if (kind.startsWith("resume")) {
        url = kind === "resume-pdf" ? "/api/tailored-resume" : "/api/resume-docx";
        body = { resume: R, summary: editSummary, bullets: editBullets, company, role };
        const ext = kind === "resume-pdf" ? "pdf" : "docx";
        const slug = (R.name || "Resume").replace(/[^a-z0-9]/gi, "_");
        filename = company
          ? `${slug}_Resume_${company.replace(/[^a-z0-9]/gi, "_")}.${ext}`
          : `${slug}_Resume_Tailored.${ext}`;
      } else {
        url = kind === "cl-pdf" ? "/api/cover-letter-pdf" : "/api/cover-letter-docx";
        body = {
          sender: {
            name: R.name || "",
            email: R.email || "",
            phone: R.phone || "",
            location: R.location || "",
          },
          company,
          role,
          coverLetter: editCover,
        };
        const ext = kind === "cl-pdf" ? "pdf" : "docx";
        const slug = (R.name || "Cover_Letter").replace(/[^a-z0-9]/gi, "_");
        filename = company
          ? `${slug}_Cover_Letter_${company.replace(/[^a-z0-9]/gi, "_")}.${ext}`
          : `${slug}_Cover_Letter.${ext}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setTailorErr(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDl(null);
    }
  };

  const onGenerateReferral = async () => {
    setRefErr(null);
    if (!refName.trim()) {
      setRefErr("Give a name (someone you know or can find at this company).");
      return;
    }
    setRefLoading(true);
    try {
      const r = await referralFn({
        data: { personName: refName.trim(), company, role, context: "" },
      });
      setRefDm(r.dm);
    } catch (e) {
      setRefErr(e instanceof Error ? e.message : "Failed to draft DM.");
    } finally {
      setRefLoading(false);
    }
  };

  const markApplied = useMutation({
    mutationFn: () =>
      upsertAppFn({
        data: {
          company,
          role,
          stage: applyStage,
          source: applySource,
          jd_url: ctx?.postingUrl || "",
          notes: refDm ? `Referral DM sent to ${refName}` : null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["apply-context", matchId] });
    },
  });

  const goTo = (id: string | null) => {
    if (!id) return;
    navigate({ to: "/apply/go", search: { matchId: id } });
  };

  const salaryLabel = useMemo(() => fmtSalary(ctx?.salary ?? null), [ctx?.salary]);

  return (
    <main
      className="min-h-screen bg-background px-6 py-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/apply/matches" className="text-sm text-muted-foreground hover:text-foreground">
            ← All matches
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => goTo(ctx?.stack.prevId ?? null)}
              disabled={!ctx?.stack.prevId}
              className="rounded-md border border-border px-3 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="text-muted-foreground">
              {ctx ? `${ctx.stack.index + 1} / ${ctx.stack.ids.length}` : ""}
            </span>
            <button
              type="button"
              onClick={() => goTo(ctx?.stack.nextId ?? null)}
              disabled={!ctx?.stack.nextId}
              className="rounded-md border border-border px-3 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>

        {!matchId && (
          <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No match selected.{" "}
            <Link to="/apply/matches" className="text-primary hover:underline">
              Pick one from your matches
            </Link>
            .
          </div>
        )}

        {matchId && ctxQ.isLoading && (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        )}
        {matchId && ctxQ.data === null && (
          <p className="mt-8 text-sm text-destructive">Match not found or not yours.</p>
        )}

        {ctx && (
          <>
            {/* Header */}
            <header className="mt-8 border-b border-border pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Apply
              </p>
              <h1
                className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {ctx.match.role}
              </h1>
              <p className="mt-1 text-lg text-foreground">{ctx.match.company}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {ctx.match.location && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                    {ctx.match.location}
                  </span>
                )}
                {ctx.remote && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-400">
                    Remote
                  </span>
                )}
                {salaryLabel && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                    {salaryLabel}
                  </span>
                )}
                {ctx.experienceLevel && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                    {ctx.experienceLevel}
                  </span>
                )}
                {ctx.applied && (
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary">
                    Already logged as applied
                  </span>
                )}
                {ctx.postingUrl && (
                  <a
                    href={ctx.postingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-primary hover:underline"
                  >
                    Open posting ↗
                  </a>
                )}
              </div>
            </header>

            {/* JD */}
            <section className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Job description
                </h2>
                {ctx.jobDescription && (
                  <button
                    type="button"
                    onClick={() => setJdExpanded((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {jdExpanded ? "Hide" : "Show more"}
                  </button>
                )}
              </div>
              {ctx.jobDescription ? (
                <div className="mt-3 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
                  <div
                    className={
                      jdExpanded
                        ? "whitespace-pre-wrap"
                        : "whitespace-pre-wrap line-clamp-4"
                    }
                  >
                    {ctx.jobDescription}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Source: {ctx.jdSource === "job_listing" ? "live posting" : "your prior tailor session"}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    No JD on file. Paste it here (needed to tailor).
                  </p>
                  <textarea
                    value={jdOverride}
                    onChange={(e) => setJdOverride(e.target.value)}
                    placeholder="Paste the job description…"
                    rows={8}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
                  />
                </div>
              )}
            </section>

            {/* Primary action */}
            <section className="mt-8 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground">Generate:</span>
                <TailorModePicker mode={mode} onChange={setMode} disabled={tailorLoading} />
              </div>
              <button
                type="button"
                onClick={onTailor}
                disabled={tailorLoading}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground disabled:opacity-50"
              >
                {tailorLoading
                  ? mode === "resume"
                    ? "Tailoring resume… (20–40s)"
                    : mode === "cover"
                      ? "Drafting cover letter… (20–40s)"
                      : "Preparing resume + cover letter… (20–40s)"
                  : result
                    ? mode === "resume"
                      ? "Re-tailor resume"
                      : mode === "cover"
                        ? "Re-draft cover letter"
                        : "Re-prepare resume + cover letter"
                    : mode === "resume"
                      ? "Tailor resume"
                      : mode === "cover"
                        ? "Draft cover letter"
                        : "Prepare resume + cover letter"}
              </button>
              <p className="text-xs text-muted-foreground">
                One AI call, grounded in your saved resume — no fabrication. Edit anything below before you download.
              </p>
              {tailorErr && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {tailorErr}
                </p>
              )}
            </section>

            {/* Results */}
            {result && (
              <section className="mt-10 space-y-6">
                <InjectionNotice injection={result.injection} />

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      ✓ Ready · Match{" "}
                      <span className="font-bold text-primary">{result.matchScore}/100</span>
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mode !== "cover" && (
                      <>
                        {(["resume-pdf", "resume-docx"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => download(k)}
                            disabled={!!dl}
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            {dl === k ? "Building…" : k === "resume-pdf" ? "Resume PDF" : "Resume DOCX"}
                          </button>
                        ))}
                      </>
                    )}
                    {mode !== "resume" && (
                      <>
                        {(["cl-pdf", "cl-docx"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => download(k)}
                            disabled={!!dl}
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            {dl === k ? "Building…" : k === "cl-pdf" ? "Cover letter PDF" : "Cover letter DOCX"}
                          </button>
                        ))}
                      </>
                    )}
                    {mode === "both" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await download("resume-pdf");
                          await download("cl-pdf");
                        }}
                        disabled={!!dl}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Download both (PDF)
                      </button>
                    )}
                  </div>
                </div>

                <GoResultsEditor
                  result={result}
                  mode={mode}
                  editSummary={editSummary}
                  setEditSummary={setEditSummary}
                  editCover={editCover}
                  setEditCover={setEditCover}
                  editBullets={editBullets}
                  setEditBullets={setEditBullets}
                />
              </section>
            )}



            {/* Referral DM */}
            <section className="mt-10 rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Referral DM (optional)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                A warm intro is the one reliable way to reach a human instead of an algorithm.
                Who do you know — or can you find on LinkedIn — at {company}?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                  placeholder="Their name (e.g. Jane Doe)"
                  className="flex-1 min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={onGenerateReferral}
                  disabled={refLoading}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {refLoading ? "Drafting…" : "Draft DM"}
                </button>
              </div>
              {refErr && (
                <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {refErr}
                </p>
              )}
              {refDm && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      DM draft · edit before sending
                    </p>
                    <button
                      onClick={() => copy("dm", refDm)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {copied === "dm" ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <textarea
                    value={refDm}
                    onChange={(e) => setRefDm(e.target.value)}
                    rows={6}
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                  />
                </div>
              )}
            </section>

            {/* Mark applied */}
            <section className="mt-10 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Mark as applied
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                This only logs what you did. Nothing is submitted to {company} — you review and
                submit the real form yourself.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted-foreground">
                  Source
                  <select
                    value={applySource}
                    onChange={(e) => setApplySource(e.target.value as never)}
                    className="ml-2 rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="cold">Cold apply</option>
                    <option value="referral">Referral</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="event">Event</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => markApplied.mutate()}
                  disabled={markApplied.isPending || markApplied.isSuccess || ctx.applied}
                  className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {ctx.applied || markApplied.isSuccess
                    ? "Logged ✓"
                    : markApplied.isPending
                      ? "Logging…"
                      : "Log this application"}
                </button>
                {markApplied.isSuccess && !ctx.applied && (
                  <span className="text-xs text-emerald-600">Logged ✓</span>
                )}
                {ctx.stack.nextId && (
                  <button
                    type="button"
                    onClick={() => goTo(ctx.stack.nextId)}
                    className="ml-auto rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    Next match →
                  </button>
                )}
              </div>
              {markApplied.isError && (
                <p className="mt-2 text-xs text-destructive">
                  {(markApplied.error as Error)?.message || "Failed to log."}
                </p>
              )}
            </section>

            <p className="mt-8 text-xs text-muted-foreground">
              Nothing here auto-submits. No CAPTCHA solving. All AI text is grounded in your saved
              resume — no fabricated experience.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Block({
  label,
  text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <button onClick={onCopy} className="text-xs font-medium text-primary hover:underline">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground font-sans">
        {text}
      </pre>
    </div>
  );
}

function GoResultsEditor({
  result,
  mode,
  editSummary,
  setEditSummary,
  editCover,
  setEditCover,
  editBullets,
  setEditBullets,
}: {
  result: TailorResult;
  mode: TailorMode;
  editSummary: string;
  setEditSummary: (v: string) => void;
  editCover: string;
  setEditCover: (v: string) => void;
  editBullets: { company: string; title?: string; bullets: string[] }[];
  setEditBullets: (v: { company: string; title?: string; bullets: string[] }[]) => void;
}) {
  const wantResume = mode !== "cover";
  const wantCover = mode !== "resume";
  const [tab, setTab] = useState<"resume" | "cover">(mode === "cover" ? "cover" : "resume");
  useEffect(() => {
    if (mode === "resume") setTab("resume");
    else if (mode === "cover") setTab("cover");
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-border">
        {wantResume && (
          <button
            type="button"
            onClick={() => setTab("resume")}
            className={
              "-mb-px inline-flex items-center rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "resume"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            Tailored resume
          </button>
        )}
        {wantCover && (
          <button
            type="button"
            onClick={() => setTab("cover")}
            className={
              "-mb-px inline-flex items-center rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
              (tab === "cover"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            Cover letter
          </button>
        )}
      </div>

      {tab === "resume" && wantResume && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-foreground">Matched</p>
                <p className="mt-1 text-muted-foreground">
                  {result.matchedKeywords.join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Missing</p>
                <p className="mt-1 text-muted-foreground">
                  {result.missingKeywords.join(", ") || "—"}
                </p>
              </div>
            </div>
          </div>
          <EditableBlock
            label="Tailored summary"
            original={result.summary}
            value={editSummary}
            onChange={setEditSummary}
            rows={4}
          />
          {editBullets.map((b, i) => {
            const origText = result.bullets[i] ? result.bullets[i].bullets.join("\n") : "";
            return (
              <EditableBlock
                key={`${b.company}|${b.title ?? ""}|${i}`}
                label={`${[b.title, b.company].filter(Boolean).join(" — ")} — tailored bullets (one per line)`}
                original={origText}
                value={b.bullets.join("\n")}
                onChange={(v) => {
                  const next = [...editBullets];
                  next[i] = {
                    company: b.company,
                    title: b.title,
                    bullets: v
                      .split("\n")
                      .map((s) => s.replace(/^[•\-\s]+/, "").trim())
                      .filter(Boolean),
                  };
                  setEditBullets(next);
                }}
                rows={Math.max(4, b.bullets.length + 1)}
              />
            );
          })}
        </div>
      )}

      {tab === "cover" && wantCover && (
        <EditableBlock
          label="Cover letter"
          original={result.coverLetter}
          value={editCover}
          onChange={setEditCover}
          rows={14}
        />
      )}
    </div>
  );
}

