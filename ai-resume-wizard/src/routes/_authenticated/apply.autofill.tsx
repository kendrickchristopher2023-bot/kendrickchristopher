import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { generateScreenerAnswers, getMyScreenerAnswers, type ScreenerQA } from "@/lib/screener.functions";

export const Route = createFileRoute("/_authenticated/apply/autofill")({
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
  const [company, setCompany] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [answers, setAnswers] = useState<ScreenerQA[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Hydrate from the server (shared across devices + used by the browser extension).
  const serverAnswers = useQuery({ queryKey: ["screener-answers"], queryFn: () => getFn() });
  useEffect(() => {
    if (serverAnswers.data?.answers?.length) {
      setAnswers(serverAnswers.data.answers);
      return;
    }
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setAnswers(JSON.parse(cached));
    } catch {
      // ignore
    }
  }, [serverAnswers.data]);

  const gen = useMutation({
    mutationFn: () => genFn({ data: { extraContext: extraContext || undefined } }),
    onSuccess: (r) => {
      setAnswers(r.answers);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(r.answers));
      } catch {
        // ignore
      }
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed to generate."),
  });

  const fill = (text: string) => text.replaceAll("{{Company}}", company || "{{Company}}");
  const copy = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(fill(text));
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
            AI drafts answers grounded in <strong>your</strong> resume for the 12 questions almost
            every application form asks. Review and edit before you paste — nothing here submits
            for you.
          </p>
        </header>

        <div className="mt-8 space-y-3">
          <input
            type="text"
            placeholder="Company you're applying to (fills {{Company}})"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Optional context: target salary, notice period, relocation preferences, etc."
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => gen.mutate()}
              disabled={gen.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {gen.isPending ? "Generating…" : answers.length > 0 ? "Regenerate" : "Generate my answers"}
            </button>
            {answers.length > 0 && (
              <span className="text-xs text-muted-foreground">Cached locally — regenerate anytime.</span>
            )}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        {answers.length === 0 && !gen.isPending && (
          <p className="mt-8 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
            Click <strong>Generate my answers</strong> — the AI reads your resume from{" "}
            <Link to="/resume" className="text-primary hover:underline">/resume</Link> and drafts personalized answers.
          </p>
        )}

        {answers.length === 0 && !gen.isPending && (
          <p className="mt-8 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
            Click <strong>Generate my answers</strong> — the AI reads your resume from{" "}
            <Link to="/resume" className="text-primary hover:underline">/resume</Link> and drafts personalized answers.
          </p>
        )}

        {answers.some((a) => /\{\{[^}]*\}\}/.test(a.a)) && (
          <div className="mt-8 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
            <p className="font-semibold">Some answers need your attention.</p>
            <p className="mt-1 text-muted-foreground">
              Answers marked <strong>Needs customizing</strong> contain <code>{"{{...}}"}</code> placeholders and will be
              skipped by the browser extension. Edit them by hand per application, or regenerate to get fresh drafts
              (older answers may have unnecessary placeholders — regenerating fixes that).
            </p>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {answers.map((item, i) => {
            const needsCustomizing = /\{\{[^}]*\}\}/.test(item.a);
            return (
              <div key={i} className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{fill(item.q)}</p>
                    {needsCustomizing && (
                      <span className="shrink-0 rounded-full border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Needs customizing — won't autofill
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => copy(i, item.a)}
                    className="text-xs font-medium text-primary hover:underline shrink-0"
                  >
                    {copiedIdx === i ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-foreground">
                  {fill(item.a)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
