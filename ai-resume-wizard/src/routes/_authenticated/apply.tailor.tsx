import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { tailorResume, type TailorResult } from "@/lib/tailor.functions";
import { getMyResume } from "@/lib/resume.functions";
import { getMatchPrefill } from "@/lib/matches.functions";

const tailorSearchSchema = z.object({
  matchId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/apply/tailor")({
  validateSearch: tailorSearchSchema,
  head: () => ({
    meta: [
      { title: "AI Resume Tailor — Christopher Kendrick" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: TailorPage,
});

type HistoryEntry = {
  id: string;
  company: string;
  role: string;
  createdAt: number;
  result: TailorResult;
};

const HISTORY_KEY = "ck.tailor.history.v1";

function TailorPage() {
  const tailor = useServerFn(tailorResume);
  const getResume = useServerFn(getMyResume);
  const prefillFn = useServerFn(getMatchPrefill);
  const { matchId } = Route.useSearch();
  const { data: resumeData } = useQuery({
    queryKey: ["my-resume"],
    queryFn: () => getResume({ data: {} }),
  });
  const prefillQ = useQuery({
    queryKey: ["match-prefill", matchId],
    queryFn: () => prefillFn({ data: { matchId: matchId! } }),
    enabled: !!matchId,
    staleTime: 60_000,
  });


  const [jd, setJd] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [clPdfLoading, setClPdfLoading] = useState(false);
  const [clDocxLoading, setClDocxLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Init empty on SSR; hydrate from localStorage post-mount to avoid mismatch.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const loadHistory = (): HistoryEntry[] => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    } catch {
      return [];
    }
  };
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Prefill from a Job Matches row when arriving with ?matchId=…
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !prefillQ.data) return;
    const p = prefillQ.data;
    setCompany((c) => c || p.company || "");
    setRole((r) => r || p.role || "");
    if (p.jobDescription) setJd((j) => j || p.jobDescription || "");
    setPrefilled(true);
  }, [prefillQ.data, prefilled]);




  const saveHistory = (entry: HistoryEntry) => {
    const next = [entry, ...loadHistory()].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    setHistory(next);
  };

  const onTailor = async () => {
    setErr(null);
    setResult(null);
    if (jd.trim().length < 30) {
      setErr("Paste the full job description (at least a few sentences).");
      return;
    }
    setLoading(true);
    try {
      const r = await tailor({ data: { jobDescription: jd, company, role } });
      setResult(r);
      saveHistory({
        id: crypto.randomUUID(),
        company: company || "(no company)",
        role: role || "(no role)",
        createdAt: Date.now(),
        result: r,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const download = async (kind: "pdf" | "docx") => {
    if (!result) return;
    if (!resumeData?.resume) {
      setErr("No resume found. Visit /resume to set one up first.");
      return;
    }
    kind === "pdf" ? setPdfLoading(true) : setDocxLoading(true);
    try {
      const url = kind === "pdf" ? "/api/tailored-resume" : "/api/resume-docx";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeData.resume,
          summary: result.summary,
          bullets: result.bullets,
          company,
          role,
        }),
      });
      if (!res.ok) throw new Error(`${kind.toUpperCase()} generation failed (${res.status})`);

      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = (resumeData.resume.name || "Resume").replace(/[^a-z0-9]/gi, "_");
      a.href = href;
      a.download = company
        ? `${slug}_Resume_${company.replace(/[^a-z0-9]/gi, "_")}.${kind}`
        : `${slug}_Resume_Tailored.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setErr(e instanceof Error ? e.message : `${kind.toUpperCase()} export failed.`);
    } finally {
      kind === "pdf" ? setPdfLoading(false) : setDocxLoading(false);
    }
  };

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const fullResumeText = result
    ? [
        `${result.summary}`,
        "",
        ...result.bullets.flatMap((b) => [`# ${b.company}`, ...b.bullets.map((x) => `• ${x}`), ""]),
      ].join("\n")
    : "";

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            AI-powered
          </span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Resume Tailor
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Paste a job description. Get a tailored resume.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Reweights and rewrites your existing bullets to match the role's language.
            No fabrication — same experience, sharper framing. Download as a fresh PDF or
            copy the text into any application form.
          </p>
        </header>

        <section className="mt-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Role title (optional)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={10}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onTailor}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Tailoring…" : "Tailor my resume"}
            </button>
            {result && (
              <>
                <button
                  type="button"
                  onClick={() => download("pdf")}
                  disabled={pdfLoading || docxLoading}
                  className="inline-flex items-center justify-center rounded-md border border-input px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-accent"
                >
                  {pdfLoading ? "Building PDF…" : "Download tailored PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => download("docx")}
                  disabled={pdfLoading || docxLoading}
                  className="inline-flex items-center justify-center rounded-md border border-input px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-accent"
                >
                  {docxLoading ? "Building DOCX…" : "Download tailored DOCX"}
                </button>
              </>
            )}
          </div>
          {err && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
        </section>

        {result && (
          <section className="mt-12 space-y-8">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Match score
                </p>
                <p className="text-2xl font-bold text-primary">{result.matchScore}/100</p>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-foreground">Matched keywords</p>
                  <p className="mt-1 text-muted-foreground">
                    {result.matchedKeywords.join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Missing keywords</p>
                  <p className="mt-1 text-muted-foreground">
                    {result.missingKeywords.join(", ") || "—"}
                  </p>
                </div>
              </div>
            </div>

            <Block
              label="Tailored summary"
              text={result.summary}
              copied={copied === "summary"}
              onCopy={() => copy("summary", result.summary)}
            />

            {result.bullets.map((b) => (
              <Block
                key={b.company}
                label={`${b.company} — tailored bullets`}
                text={b.bullets.map((x) => `• ${x}`).join("\n")}
                copied={copied === b.company}
                onCopy={() => copy(b.company, b.bullets.map((x) => `• ${x}`).join("\n"))}
              />
            ))}

            <Block
              label="Cover letter"
              text={result.coverLetter}
              copied={copied === "cover"}
              onCopy={() => copy("cover", result.coverLetter)}
            />

            <Block
              label="Full tailored resume text (copy-paste into any form)"
              text={fullResumeText}
              copied={copied === "full"}
              onCopy={() => copy("full", fullResumeText)}
            />
          </section>
        )}

        {history.length > 0 && (
          <section className="mt-16 border-t border-border pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Recent tailors
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-2"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {h.role} · {h.company}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString()} · Match {h.result.matchScore}/100
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setResult(h.result);
                      setCompany(h.company === "(no company)" ? "" : h.company);
                      setRole(h.role === "(no role)" ? "" : h.role);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Reopen
                  </button>
                </li>
              ))}
            </ul>
          </section>
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
