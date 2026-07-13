import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractResumeFromText, saveMyResume, type MasterResume } from "@/lib/resume.functions";

export function ResumeOnboarding({ onSaved }: { onSaved: (r: MasterResume) => void }) {
  const extractFn = useServerFn(extractResumeFromText);
  const saveFn = useServerFn(saveMyResume);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<MasterResume | null>(null);
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const extract = async () => {
    setErr(null);
    if (text.trim().length < 30) {
      setErr("Paste at least a few sentences — your resume or LinkedIn 'About' works well.");
      return;
    }
    setBusy(true);
    try {
      const { resume } = await extractFn({ data: { text } });
      setDraft(resume);
      setJson(JSON.stringify(resume, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not parse. Try adding more detail.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setErr(null);
    let toSave: MasterResume;
    try {
      toSave = JSON.parse(json);
    } catch {
      setErr("The JSON below is malformed — fix it, then save.");
      return;
    }
    setBusy(true);
    try {
      await saveFn({ data: { resume: toSave } });
      onSaved(toSave);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-foreground">Let's set up your resume</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste your existing resume, LinkedIn "About" text, or a rough career summary. We'll
          structure it into a parser-friendly format you can review before saving.
        </p>
        {!draft && (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste your resume or LinkedIn About here…"
              className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={extract}
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Structuring…" : "Structure with AI"}
              </button>
            </div>
          </>
        )}

        {draft && (
          <>
            <p className="mt-4 text-sm text-foreground">
              Review the structured JSON below. Edit anything, then save. This is what every
              downstream tool (tailor, cover letter, exports, MCP) reads.
            </p>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={22}
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save resume"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setJson("");
                }}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                Start over
              </button>
            </div>
          </>
        )}

        {err && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}
