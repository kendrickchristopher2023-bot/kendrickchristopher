import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { extractResumeFromText, saveMyResume, type MasterResume } from "@/lib/resume.functions";
import { supabase } from "@/integrations/supabase/client";

type Tab = "paste" | "upload";

export function ResumeOnboarding({ onSaved }: { onSaved: (r: MasterResume) => void }) {
  const extractFn = useServerFn(extractResumeFromText);
  const saveFn = useServerFn(saveMyResume);
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<MasterResume | null>(null);
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const extractFromPaste = async () => {
    setErr(null);
    if (text.trim().length < 30) {
      setErr("Paste at least a few sentences — your resume or LinkedIn 'About' works well.");
      return;
    }
    setBusy(true);
    setBusyMsg("Structuring…");
    try {
      const { resume } = await extractFn({ data: { text } });
      setDraft(resume);
      setJson(JSON.stringify(resume, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not parse. Try adding more detail.");
    } finally {
      setBusy(false);
      setBusyMsg("");
    }
  };

  const extractFromFile = async () => {
    setErr(null);
    if (!file) {
      setErr("Choose a file to upload.");
      return;
    }
    setBusy(true);
    setBusyMsg("Reading file…");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "resume");
      setBusyMsg("Extracting with AI…");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const payload = (await res.json().catch(() => ({}))) as { resume?: MasterResume; error?: string };
      if (!res.ok || !payload.resume) {
        throw new Error(payload.error || `Extraction failed (${res.status})`);
      }
      setDraft(payload.resume);
      setJson(JSON.stringify(payload.resume, null, 2));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not extract. Try pasting instead.");
    } finally {
      setBusy(false);
      setBusyMsg("");
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

  const TabButton = ({ id, label }: { id: Tab; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={
        "px-3 py-1.5 text-sm font-medium rounded-md " +
        (tab === id
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent")
      }
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-foreground">Let's set up your resume</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste your existing resume, upload a PDF/DOCX/image, or share your LinkedIn "About"
          text. We'll structure it into a parser-friendly format you can review before saving.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          New here? Read the{" "}
          <a href="/help/getting-started" className="text-primary hover:underline">Getting Started guide</a>{" "}
          or the{" "}
          <a href="/help/faq" className="text-primary hover:underline">FAQ</a>.
        </p>

        {!draft && (
          <>
            <div className="mt-4 flex gap-2">
              <TabButton id="paste" label="Paste text" />
              <TabButton id="upload" label="Upload a file" />
            </div>

            {tab === "paste" && (
              <>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={12}
                  placeholder="Paste your resume or LinkedIn About here…"
                  className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed"
                />
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={extractFromPaste}
                    disabled={busy}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? busyMsg || "Working…" : "Structure with AI"}
                  </button>
                </div>
              </>
            )}

            {tab === "upload" && (
              <>
                <div className="mt-3 rounded-md border border-dashed border-input bg-background p-6 text-center">
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    PDF, DOCX, PNG, JPEG, or WEBP · up to 10MB. Your file isn't stored — only
                    the structured text you review and save.
                  </p>
                  {file && (
                    <p className="mt-2 text-xs text-foreground">
                      Selected: <span className="font-medium">{file.name}</span> ·{" "}
                      {(file.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={extractFromFile}
                    disabled={busy || !file}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {busy ? busyMsg || "Working…" : "Extract from file"}
                  </button>
                </div>
              </>
            )}
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
