import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { saveMyResume, type MasterResume } from "@/lib/resume.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  resume: MasterResume;
  resumeId: string | null;
  onCancel: () => void;
  onSaved: () => void;
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const heading = { fontFamily: "'Playfair Display', Georgia, serif" } as const;

export function ResumeEditor({ resume, resumeId, onCancel, onSaved }: Props) {
  const saveFn = useServerFn(saveMyResume);
  const qc = useQueryClient();
  const initial = useMemo(() => clone(resume), [resume]);
  const [draft, setDraft] = useState<MasterResume>(() => clone(resume));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initial),
    [draft, initial],
  );

  // Warn before unload with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function patch<K extends keyof MasterResume>(key: K, value: MasterResume[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setErr(null);
    setSaving(true);
    try {
      const payload: MasterResume = { ...draft, lastUpdated: todayLabel() };
      await saveFn({ data: { resume: payload, id: resumeId ?? undefined } });
      await qc.invalidateQueries({ queryKey: ["my-resume"] });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty && !window.confirm("Discard your unsaved changes?")) return;
    onCancel();
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-2 border-b border-border bg-background/95 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Editing resume</span>
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
            {savedFlash && <span className="text-xs font-medium text-primary">✓ Saved</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      )}

      <article className="bg-card text-card-foreground rounded-xl border border-border p-6 sm:p-10 shadow-sm space-y-10">
        {/* Header */}
        <EditorSection title="Header">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={draft.name ?? ""} onChange={(e) => patch("name", e.target.value)} />
            </Field>
            <Field label="Title">
              <Input value={draft.title ?? ""} onChange={(e) => patch("title", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={draft.email ?? ""} onChange={(e) => patch("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone ?? ""} onChange={(e) => patch("phone", e.target.value)} />
            </Field>
            <Field label="Location">
              <Input value={draft.location ?? ""} onChange={(e) => patch("location", e.target.value)} />
            </Field>
            <Field label="GitHub">
              <Input value={draft.github ?? ""} onChange={(e) => patch("github", e.target.value)} />
            </Field>
            <Field label="LinkedIn">
              <Input value={draft.linkedin ?? ""} onChange={(e) => patch("linkedin", e.target.value)} />
            </Field>
          </div>
        </EditorSection>

        {/* Summary */}
        <EditorSection title="Summary">
          <Textarea
            rows={5}
            value={draft.summary ?? ""}
            onChange={(e) => patch("summary", e.target.value)}
          />
        </EditorSection>

        {/* Skills */}
        <EditorSection title="Skills">
          <StringListEditor
            values={draft.competencies ?? []}
            onChange={(next) => patch("competencies", next)}
            addLabel="+ Add skill"
            placeholder="e.g. Change Management"
          />
        </EditorSection>

        {/* Experience */}
        <EditorSection title="Experience">
          <div className="space-y-6">
            {(draft.experience ?? []).map((role, idx) => (
              <div key={idx} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Job #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm("Remove this job?")) return;
                      const next = draft.experience.slice();
                      next.splice(idx, 1);
                      patch("experience", next);
                    }}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Remove job
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title">
                    <Input
                      value={role.title}
                      onChange={(e) => {
                        const next = draft.experience.slice();
                        next[idx] = { ...role, title: e.target.value };
                        patch("experience", next);
                      }}
                    />
                  </Field>
                  <Field label="Company">
                    <Input
                      value={role.company}
                      onChange={(e) => {
                        const next = draft.experience.slice();
                        next[idx] = { ...role, company: e.target.value };
                        patch("experience", next);
                      }}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={role.location}
                      onChange={(e) => {
                        const next = draft.experience.slice();
                        next[idx] = { ...role, location: e.target.value };
                        patch("experience", next);
                      }}
                    />
                  </Field>
                  <Field label="Dates">
                    <Input
                      value={role.dates}
                      onChange={(e) => {
                        const next = draft.experience.slice();
                        next[idx] = { ...role, dates: e.target.value };
                        patch("experience", next);
                      }}
                    />
                  </Field>
                </div>
                <div>
                  <Label className="text-xs font-medium">Bullets</Label>
                  <div className="mt-2 space-y-2">
                    {(role.bullets ?? []).map((b, bi) => (
                      <div key={bi} className="flex gap-2">
                        <Textarea
                          rows={2}
                          value={b}
                          onChange={(e) => {
                            const next = draft.experience.slice();
                            const bullets = role.bullets.slice();
                            bullets[bi] = e.target.value;
                            next[idx] = { ...role, bullets };
                            patch("experience", next);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = draft.experience.slice();
                            const bullets = role.bullets.slice();
                            bullets.splice(bi, 1);
                            next[idx] = { ...role, bullets };
                            patch("experience", next);
                          }}
                          className="shrink-0 rounded-md border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = draft.experience.slice();
                        next[idx] = { ...role, bullets: [...(role.bullets ?? []), ""] };
                        patch("experience", next);
                      }}
                      className="rounded-md border border-dashed border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      + Add bullet
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patch("experience", [
                  ...(draft.experience ?? []),
                  { title: "", company: "", location: "", dates: "", bullets: [""] },
                ])
              }
              className="rounded-md border border-dashed border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              + Add job
            </button>
          </div>
        </EditorSection>

        {/* Additional experience */}
        <EditorSection title="Additional Experience">
          <StringListEditor
            values={draft.additionalExperience ?? []}
            onChange={(next) => patch("additionalExperience", next)}
            addLabel="+ Add line"
            placeholder="Role, Company — Dates"
            multiline
          />
        </EditorSection>

        {/* Proficiencies */}
        <EditorSection title="Technical Proficiencies">
          <div className="space-y-2">
            {(draft.proficiencies ?? []).map((p, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
                <Input
                  value={p.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = draft.proficiencies.slice();
                    next[i] = { ...p, label: e.target.value };
                    patch("proficiencies", next);
                  }}
                />
                <Input
                  value={p.value}
                  placeholder="Value"
                  onChange={(e) => {
                    const next = draft.proficiencies.slice();
                    next[i] = { ...p, value: e.target.value };
                    patch("proficiencies", next);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = draft.proficiencies.slice();
                    next.splice(i, 1);
                    patch("proficiencies", next);
                  }}
                  className="rounded-md border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patch("proficiencies", [...(draft.proficiencies ?? []), { label: "", value: "" }])
              }
              className="rounded-md border border-dashed border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              + Add proficiency
            </button>
          </div>
        </EditorSection>

        {/* Education */}
        <EditorSection title="Education">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Degree">
              <Input
                value={draft.education?.degree ?? ""}
                onChange={(e) =>
                  patch("education", { ...(draft.education ?? { degree: "", school: "" }), degree: e.target.value })
                }
              />
            </Field>
            <Field label="School">
              <Input
                value={draft.education?.school ?? ""}
                onChange={(e) =>
                  patch("education", { ...(draft.education ?? { degree: "", school: "" }), school: e.target.value })
                }
              />
            </Field>
          </div>
        </EditorSection>

        {/* Certifications */}
        <EditorSection title="Certifications">
          <StringListEditor
            values={draft.certifications ?? []}
            onChange={(next) => patch("certifications", next)}
            addLabel="+ Add certification"
            placeholder="e.g. AWS Certified Cloud Practitioner"
          />
        </EditorSection>

        {/* Projects */}
        <EditorSection title="Projects">
          <div className="space-y-4">
            {(draft.projects ?? []).map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project #{i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (draft.projects ?? []).slice();
                      next.splice(i, 1);
                      patch("projects", next);
                    }}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title">
                    <Input
                      value={p.title}
                      onChange={(e) => {
                        const next = (draft.projects ?? []).slice();
                        next[i] = { ...p, title: e.target.value };
                        patch("projects", next);
                      }}
                    />
                  </Field>
                  <Field label="Stack">
                    <Input
                      value={p.stack}
                      onChange={(e) => {
                        const next = (draft.projects ?? []).slice();
                        next[i] = { ...p, stack: e.target.value };
                        patch("projects", next);
                      }}
                    />
                  </Field>
                  <Field label="Link">
                    <Input
                      value={p.href ?? ""}
                      onChange={(e) => {
                        const next = (draft.projects ?? []).slice();
                        next[i] = { ...p, href: e.target.value };
                        patch("projects", next);
                      }}
                    />
                  </Field>
                </div>
                <Field label="Outcome">
                  <Textarea
                    rows={2}
                    value={p.outcome}
                    onChange={(e) => {
                      const next = (draft.projects ?? []).slice();
                      next[i] = { ...p, outcome: e.target.value };
                      patch("projects", next);
                    }}
                  />
                </Field>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patch("projects", [
                  ...(draft.projects ?? []),
                  { title: "", stack: "", outcome: "", href: "" },
                ])
              }
              className="rounded-md border border-dashed border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              + Add project
            </button>
          </div>
        </EditorSection>
      </article>

      <div className="flex items-center justify-end gap-2 pb-8">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-foreground" style={heading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StringListEditor({
  values,
  onChange,
  addLabel,
  placeholder,
  multiline,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          {multiline ? (
            <Textarea
              rows={2}
              value={v}
              placeholder={placeholder}
              onChange={(e) => {
                const next = values.slice();
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          ) : (
            <Input
              value={v}
              placeholder={placeholder}
              onChange={(e) => {
                const next = values.slice();
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          )}
          <button
            type="button"
            onClick={() => {
              const next = values.slice();
              next.splice(i, 1);
              onChange(next);
            }}
            className="shrink-0 rounded-md border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="rounded-md border border-dashed border-input px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        {addLabel}
      </button>
    </div>
  );
}
