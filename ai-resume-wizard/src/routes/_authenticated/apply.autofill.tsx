import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  generateScreenerAnswers,
  getMyScreenerAnswers,
  type ScreenerQA,
} from "@/lib/screener.functions";
import { getMatchPrefill } from "@/lib/matches.functions";
import { DownloadButtons } from "@/components/DownloadButtons";
import { InjectionNotice } from "@/components/TailorEdit";

const searchSchema = z.object({
  matchId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/apply/autofill")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Application Autofill — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: AutofillPage,
});

const CACHE_KEY = "aijk.screener.answers.v1";

function AutofillPage() {
  const genFn = useServerFn(generateScreenerAnswers);
  const getFn = useServerFn(getMyScreenerAnswers);
  const prefillFn = useServerFn(getMatchPrefill);
  const { matchId } = Route.useSearch();

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [customQs, setCustomQs] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [answers, setAnswers] = useState<ScreenerQA[]>([]);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<"generic" | "targeted">("generic");
  const [injection, setInjection] = useState<
    { detected: boolean; snippets: string[] } | undefined
  >(undefined);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Prefill from a saved match when ?matchId= is present.
  const prefillQ = useQuery({
    queryKey: ["autofill-prefill", matchId],
    queryFn: () => prefillFn({ data: { matchId: matchId! } }),
    enabled: !!matchId,
    staleTime: 60_000,
  });
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !prefillQ.data) return;
    const p = prefillQ.data;
    setCompany((c) => c || p.company || "");
    setRole((r) => r || p.role || "");
    if (p.jobDescription) setJd((j) => j || p.jobDescription || "");
    setPrefilled(true);
  }, [prefillQ.data, prefilled]);

  // Hydrate the GENERIC set from server (used by the browser extension) or
  // local cache. This is only shown when no targeted context is entered.
  const serverAnswers = useQuery({ queryKey: ["screener-answers"], queryFn: () => getFn() });
  useEffect(() => {
    if (answers.length > 0) return;
    if (serverAnswers.data?.answers?.length) {
      setAnswers(serverAnswers.data.answers);
      setMode("generic");
      return;
    }
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setAnswers(JSON.parse(cached));
        setMode("generic");
      }
    } catch {
      // ignore
    }
  }, [serverAnswers.data, answers.length]);

  const targetedIntent =
    company.trim().length > 0 || role.trim().length > 0 || jd.trim().length >= 30;

  const gen = useMutation({
    mutationFn: () =>
      genFn({
        data: {
          extraContext: extraContext || undefined,
          company: company || undefined,
          role: role || undefined,
          jobDescription: jd.trim().length >= 30 ? jd : undefined,
          customQuestions: customQs
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 10),
        },
      }),
    onSuccess: (r) => {
      setAnswers(r.answers);
      setEdits({});
      setMode(r.mode);
      setInjection(r.injection);
      setErr(null);
      // Only cache the reusable generic set locally.
      if (r.mode === "generic") {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(r.answers));
        } catch {
          // ignore
        }
      }
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed to generate."),
  });

  const fill = (text: string) =>
    text.replaceAll("{{Company}}", company || "{{Company}}");
  const currentText = (i: number) => edits[i] ?? answers[i]?.a ?? "";
  const setEdit = (i: number, v: string) => setEdits((e) => ({ ...e, [i]: v }));
  const revert = (i: number) =>
    setEdits((e) => {
      const { [i]: _, ...rest } = e;
      return rest;
    });

  const copy = async (idx: number) => {
    await navigator.clipboard.writeText(fill(currentText(idx)));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

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
          <Link to="/apply/matches" className="text-sm text-muted-foreground hover:text-foreground">
            Apply to a saved job →
          </Link>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Application Autofill
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Screener answers, ready to copy.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            AI drafts answers grounded in <strong>your</strong> resume for the questions almost
            every application form asks. Review, edit, then copy or download — nothing here
            submits for you.
          </p>
        </header>

        <div className="mt-6 rounded-lg border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">Two modes:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <strong className="text-foreground">Generic</strong> — leave company/role blank.
              Reusable answers with <code>{"{{Company}}"}</code> stop-signs on the few questions
              that need a company name. This set is what the browser extension autofills from.
            </li>
            <li>
              <strong className="text-foreground">Targeted</strong> — fill company, role, or a
              job description. Answers name the company naturally with no placeholders. These stay
              on this page only (they don't overwrite your reusable set).
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Currently:{" "}
            <span className="font-semibold text-foreground">
              {targetedIntent ? "targeted" : "generic"}
            </span>{" "}
            mode.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Company (optional)"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Position / role (optional)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="Optional: paste the job description for sharper, targeted answers"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          />
          <textarea
            placeholder="Optional context: target salary, notice period, relocation preferences, etc."
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Optional: your own questions, one per line (max 10)"
            value={customQs}
            onChange={(e) => setCustomQs(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => gen.mutate()}
              disabled={gen.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {gen.isPending
                ? "Generating…"
                : answers.length > 0
                  ? targetedIntent
                    ? "Regenerate (targeted)"
                    : "Regenerate (generic)"
                  : targetedIntent
                    ? "Generate targeted answers"
                    : "Generate my answers"}
            </button>
            {answers.length > 0 && mode === "generic" && (
              <span className="text-xs text-muted-foreground">
                Generic set — saved for the browser extension.
              </span>
            )}
            {answers.length > 0 && mode === "targeted" && (
              <span className="text-xs text-muted-foreground">
                Targeted set — session only, reusable set untouched.
              </span>
            )}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        {answers.length === 0 && !gen.isPending && (
          <p className="mt-8 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
            Click <strong>Generate</strong> — the AI reads your resume from{" "}
            <Link to="/resume" className="text-primary hover:underline">/resume</Link> and drafts personalized answers.
          </p>
        )}

        {injection?.detected && (
          <div className="mt-8">
            <InjectionNotice injection={injection} />
          </div>
        )}

        {answers.length > 0 && mode === "generic" && answers.some((a) => /\{\{[^}]*\}\}/.test(a.a)) && (
          <div className="mt-8 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
            <p className="font-semibold">Some answers need your attention.</p>
            <p className="mt-1 text-muted-foreground">
              Answers marked <strong>Needs customizing</strong> contain <code>{"{{...}}"}</code> placeholders and will be
              skipped by the browser extension. Fill Company above to substitute, edit by hand, or switch to targeted mode
              for a version written specifically for a job.
            </p>
          </div>
        )}

        {answers.length > 0 && (
          <div className="mt-6 flex items-center justify-end">
            <DownloadButtons
              ready={answers.length > 0}
              build={() => ({
                filename: `Application_Autofill${company ? `_${company}` : ""}`,
                title: "Application Autofill",
                subtitle: [role, company].filter(Boolean).join(" @ ") || "Screener Q&A reference",
                sections: answers.map((a, i) => ({
                  heading: fill(a.q),
                  body: fill(currentText(i)),
                })),
              })}
            />
          </div>
        )}

        <div className="mt-8 space-y-4">
          {answers.map((item, i) => {
            const value = currentText(i);
            const needsCustomizing = /\{\{[^}]*\}\}/.test(value);
            const edited = value !== item.a;
            return (
              <div key={i} className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{fill(item.q)}</p>
                    {edited && (
                      <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                        edited
                      </span>
                    )}
                    {needsCustomizing && (
                      <span className="shrink-0 rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Needs customizing — won't autofill
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {edited && (
                      <button
                        onClick={() => revert(i)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                        title="Revert to the AI-generated version"
                      >
                        Revert
                      </button>
                    )}
                    <button
                      onClick={() => copy(i)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {copiedIdx === i ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                </div>
                <textarea
                  value={fill(value)}
                  onChange={(e) => setEdit(i, e.target.value)}
                  rows={Math.max(3, Math.min(10, Math.ceil(value.length / 90)))}
                  className="w-full resize-y rounded-b-lg bg-transparent px-4 py-4 text-sm leading-relaxed text-foreground font-sans focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
