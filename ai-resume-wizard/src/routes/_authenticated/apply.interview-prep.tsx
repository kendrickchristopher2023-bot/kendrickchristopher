import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  generateInterviewPrep,
  listInterviewSessions,
  saveInterviewAnswers,
  type StarAnswer,
} from "@/lib/interview.functions";
import { getMatchPrefill } from "@/lib/matches.functions";

const prepSearchSchema = z.object({
  matchId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/apply/interview-prep")({
  validateSearch: prepSearchSchema,
  head: () => ({
    meta: [
      { title: "Interview Prep — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Structured-story (Situation → Task → Action → Result) interview answers built from your real resume." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: InterviewPrepPage,
});

function InterviewPrepPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listInterviewSessions);
  const genFn = useServerFn(generateInterviewPrep);
  const prefillFn = useServerFn(getMatchPrefill);
  const { matchId } = Route.useSearch();
  const sessionsQ = useQuery({ queryKey: ["interview-sessions"], queryFn: () => listFn() });
  const prefillQ = useQuery({
    queryKey: ["match-prefill", matchId],
    queryFn: () => prefillFn({ data: { matchId: matchId! } }),
    enabled: !!matchId,
    staleTime: 60_000,
  });

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !prefillQ.data) return;
    const p = prefillQ.data;
    setCompany((c) => c || p.company || "");
    setRole((r) => r || p.role || "");
    if (p.jobDescription) setJd((j) => j || p.jobDescription || "");
    setPrefilled(true);
  }, [prefillQ.data, prefilled]);


  const gen = useMutation({
    mutationFn: () =>
      genFn({
        data: {
          company,
          role,
          jobDescription: jd,
          questions: questions
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20),
        },
      }),
    onSuccess: (r) => {
      setErr(null);
      setActiveId(r.sessionId);
      qc.invalidateQueries({ queryKey: ["interview-sessions"] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });

  const active = sessionsQ.data?.find((s) => s.id === activeId) ?? sessionsQ.data?.[0];

  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-4xl">
        <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
          ← Application kit
        </Link>
        <header className="mt-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Interview Prep</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Structured stories from your real experience.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Paste a job description, get Situation → Task → Action → Result answers grounded in
            your resume. Edit, save, and copy each one.
          </p>
        </header>

        <section className="mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">New session</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} className="rounded border border-input bg-background px-3 py-2 text-sm" />
            <input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <textarea
            placeholder="Paste job description…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded border border-input bg-background px-3 py-2 text-sm font-mono"
          />
          <textarea
            placeholder="Optional: specific questions, one per line"
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded border border-input bg-background px-3 py-2 text-sm"
          />
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <button
            onClick={() => gen.mutate()}
            disabled={gen.isPending || jd.trim().length < 30}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {gen.isPending ? "Generating…" : "Generate structured answers"}
          </button>
        </section>

        {sessionsQ.data && sessionsQ.data.length > 0 && (
          <section className="mt-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {sessionsQ.data.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    (active?.id === s.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {s.company || "—"} · {s.role || "—"}
                </button>
              ))}
            </div>
            {active && <SessionEditor key={active.id} sessionId={active.id} initial={active.answers} />}
          </section>
        )}
      </div>
    </main>
  );
}

function SessionEditor({ sessionId, initial }: { sessionId: string; initial: StarAnswer[] }) {
  const [answers, setAnswers] = useState<StarAnswer[]>(initial);
  const saveFn = useServerFn(saveInterviewAnswers);
  const save = useMutation({
    mutationFn: () => saveFn({ data: { sessionId, answers } }),
  });
  const update = (i: number, patch: Partial<StarAnswer>) => {
    setAnswers((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  };

  const copy = async (a: StarAnswer) => {
    const text = `Q: ${a.question}\n\nS: ${a.situation}\nT: ${a.task}\nA: ${a.action}\nR: ${a.result}`;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {answers.map((a, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5">
          <input
            value={a.question}
            onChange={(e) => update(i, { question: e.target.value })}
            className="w-full font-semibold text-base bg-transparent border-0 focus:outline-none focus:ring-0 mb-3"
          />
          {(["situation", "task", "action", "result"] as const).map((k) => (
            <div key={k} className="mb-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</label>
              <textarea
                value={a[k]}
                onChange={(e) => update(i, { [k]: e.target.value } as Partial<StarAnswer>)}
                rows={2}
                className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-sm"
              />
            </div>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => copy(a)} className="text-xs text-primary hover:underline">Copy</button>
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : save.isSuccess ? "Saved ✓" : "Save edits"}
        </button>
      </div>
    </div>
  );
}
