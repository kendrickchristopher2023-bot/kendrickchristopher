import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  generateResumeRewrite,
  getRewriteEntitlement,
  saveRewrittenResume,
} from "@/lib/rewrite.functions";
import type { MasterResume } from "@/lib/resume-data";
import { ResumeTabs } from "@/components/ResumeTabs";

export const Route = createFileRoute("/_authenticated/apply/rewrite")({
  head: () => ({
    meta: [
      { title: "AI Resume Rewrite" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content:
          "One-time comprehensive AI rewrite of your entire resume — grounded strictly in your real experience.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: RewritePage,
});

function RewritePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const entFn = useServerFn(getRewriteEntitlement);
  const runFn = useServerFn(generateResumeRewrite);
  const saveFn = useServerFn(saveRewrittenResume);

  const ent = useQuery({ queryKey: ["rewrite-entitlement"], queryFn: () => entFn() });

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<MasterResume | null>(null);
  const [saveMode, setSaveMode] = useState<"overwrite" | "new">("new");
  const [newName, setNewName] = useState("Rewritten resume");
  const [notes, setNotes] = useState("");
  const [placement, setPlacement] = useState<
    "auto" | "projects" | "experience" | "instructions_only"
  >("auto");

  const onGenerate = async () => {
    setErr(null);
    setDraft(null);
    setGenerating(true);
    try {
      const r = await runFn({ data: { notes: notes.trim() || undefined, placement } });
      setDraft(r.resume);
      qc.invalidateQueries({ queryKey: ["rewrite-entitlement"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    try {
      await saveFn({
        data: {
          resume: draft as unknown as Record<string, unknown>,
          mode: saveMode,
          name: saveMode === "new" ? newName : undefined,
        },
      });
      qc.invalidateQueries({ queryKey: ["my-resume"] });
      qc.invalidateQueries({ queryKey: ["my-resumes"] });
      navigate({ to: saveMode === "new" ? "/resumes" : "/resume" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const patchField = (path: (string | number)[], value: string) => {
    if (!draft) return;
    const next = JSON.parse(JSON.stringify(draft)) as MasterResume;
    let cur: unknown = next;
    for (let i = 0; i < path.length - 1; i++) {
      cur = (cur as Record<string | number, unknown>)[path[i]];
    }
    (cur as Record<string | number, unknown>)[path[path.length - 1]] = value;
    setDraft(next);
  };

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <ResumeTabs />
        <div className="flex items-center justify-end">
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {ent.data?.reason === "founder_unlimited" ? "Unlimited · Founder" : "One-time · Pro"}
          </span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Resume Rewrite
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            A comprehensive rewrite of your whole resume.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Stronger verbs, tighter phrasing, better-quantified impact — grounded strictly in what's
            already true. Unlike the per-job Tailor, this rewrites the whole document once, then you
            review and save.
          </p>
        </header>

        {ent.isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}

        {ent.data && ent.data.reason === "free_plan" && (
          <section className="mt-8 rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">This is a Pro feature</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Resume rewrite is included with the Pro plan. Your current plan is <b>Free</b>, so
              this tool isn't available.
            </p>
          </section>
        )}

        {ent.data && ent.data.reason === "already_used" && (
          <section className="mt-8 rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Rewrite already used</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You've used your included rewrite for this plan. Additional rewrites are a paid
              add-on.
            </p>
            <p className="mt-4 text-sm">
              Want another?{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:kendrickchristopher@hotmail.com?subject=Additional%20resume%20rewrite"
              >
                Email the owner
              </a>
              .
            </p>
          </section>
        )}

        {ent.data && ent.data.allowed && !draft && (
          <section className="mt-8 space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Ready to rewrite</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {ent.data.reason === "founder_unlimited"
                  ? "Founder plan — unlimited rewrites. Nothing is saved until you review the result and click Save."
                  : `This uses your one included rewrite for the ${ent.data.plan} plan. Nothing is saved until you review the result and click Save.`}
              </p>
              <div className="mt-6">
                <label htmlFor="rewrite-notes" className="text-sm font-medium text-foreground">
                  Anything you want added or changed? (optional)
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paste raw notes, rough bullet points, a project list, or plain instructions
                  (&ldquo;emphasize enablement&rdquo;). No formatting needed — it gets rewritten
                  into resume-ready wording. Nothing is invented: only what you write here is used.
                </p>
                <textarea
                  id="rewrite-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 8000))}
                  rows={10}
                  placeholder={
                    "e.g.\nAI Projects Portfolio\n- Mews Call Companion (live) — pulls Gong transcripts, drafts pre go-live follow-up emails\n- Daily Onboarding Health Check — weekday Salesforce risk digest to Slack\n- Handover Hub — in progress, paused"
                  }
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{notes.length}/8000</p>
              </div>

              <fieldset className="mt-4">
                <legend className="text-sm font-medium text-foreground">Where should it go?</legend>
                <div className="mt-2 space-y-2 text-sm">
                  {(
                    [
                      ["auto", "Let AI decide"],
                      ["projects", "Add as a new Projects / Portfolio section"],
                      ["experience", "Fold into my current roles' bullets"],
                      ["instructions_only", "Instructions only — don't add new content"],
                    ] as const
                  ).map(([v, label]) => (
                    <label key={v} className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="placement"
                        checked={placement === v}
                        onChange={() => setPlacement(v)}
                        className="mt-1"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={onGenerate}
                disabled={generating}
                className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {generating ? "Rewriting… (30–60s)" : "Rewrite my resume"}
              </button>
            </div>
            {err && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            )}
          </section>
        )}

        {draft && (
          <section className="mt-8 space-y-6">
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
              Rewrite ready. Review below, edit any field, then choose how to save.
            </div>

            <EditField
              label="Summary"
              value={draft.summary}
              onChange={(v) => patchField(["summary"], v)}
              multiline
            />

            {(draft.experience ?? []).map((exp, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {exp.company} — {exp.title} · {exp.dates}
                </p>
                <div className="mt-3 space-y-2">
                  {exp.bullets.map((b, j) => (
                    <EditField
                      key={j}
                      label={`Bullet ${j + 1}`}
                      value={b}
                      onChange={(v) => patchField(["experience", i, "bullets", j], v)}
                      multiline
                    />
                  ))}
                </div>
              </div>
            ))}

            {(draft.projects ?? []).length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects
                </p>
                <div className="mt-3 space-y-4">
                  {(draft.projects ?? []).map((p, i) => (
                    <div
                      key={i}
                      className="space-y-2 border-t border-border pt-3 first:border-0 first:pt-0"
                    >
                      <EditField
                        label={`Project ${i + 1} title`}
                        value={p.title}
                        onChange={(v) => patchField(["projects", i, "title"], v)}
                      />
                      <EditField
                        label="Stack / tools"
                        value={p.stack}
                        onChange={(v) => patchField(["projects", i, "stack"], v)}
                      />
                      <EditField
                        label="Outcome"
                        value={p.outcome}
                        onChange={(v) => patchField(["projects", i, "outcome"], v)}
                        multiline
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(draft.competencies ?? []).length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Core competencies
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(draft.competencies ?? []).map((c, i) => (
                    <EditField
                      key={i}
                      label={`Item ${i + 1}`}
                      value={c}
                      onChange={(v) => patchField(["competencies", i], v)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Save</h2>
              <div className="mt-4 space-y-3 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    checked={saveMode === "new"}
                    onChange={() => setSaveMode("new")}
                    className="mt-1"
                  />
                  <span>
                    Save as a new named resume (recommended — keeps your current primary intact)
                  </span>
                </label>
                {saveMode === "new" && (
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="ml-6 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Name"
                  />
                )}
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    checked={saveMode === "overwrite"}
                    onChange={() => setSaveMode("overwrite")}
                    className="mt-1"
                  />
                  <span>Overwrite my primary resume with the rewrite</span>
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || (saveMode === "new" && !newName.trim())}
                  className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent"
                >
                  Discard
                </button>
              </div>
              {err && (
                <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {err}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function EditField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.max(2, Math.ceil(value.length / 90))}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
