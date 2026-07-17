import { useState, useEffect } from "react";
import type { InjectionInfo } from "@/lib/prompt-safety";

/**
 * Editable text block with revert-to-AI-version. Keeps edits in local state;
 * the parent reads `value` for downloads. Shows a subtle "edited" indicator.
 */
export function EditableBlock({
  label,
  original,
  value,
  onChange,
  rows = 6,
  className = "",
}: {
  label: string;
  original: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const edited = value.trim() !== original.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={"rounded-lg border border-border bg-card " + className}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          {edited && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              edited
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {edited && (
            <button
              type="button"
              onClick={() => onChange(original)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              title="Revert to the AI-generated version"
            >
              Revert
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="text-xs font-medium text-primary hover:underline"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-y rounded-b-lg bg-transparent px-4 py-4 text-sm leading-relaxed text-foreground font-sans focus:outline-none"
      />
    </div>
  );
}

/**
 * Non-alarming notice shown above tailored results when the JD appears to
 * contain instructions addressed to the applicant (e.g. "please mention the
 * word X"). We deliberately don't auto-comply — the human should decide.
 */
export function InjectionNotice({ injection }: { injection: InjectionInfo | undefined }) {
  if (!injection?.detected) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
      <p className="font-medium">
        Heads up: this job post asks applicants to include something specific
        (e.g. a word or code) to show a human read it.
      </p>
      <p className="mt-1 text-muted-foreground">
        We deliberately left it out of your resume and cover letter — add it
        yourself if you want to comply.
      </p>
      <ul className="mt-2 space-y-1">
        {injection.snippets.map((s, i) => (
          <li
            key={i}
            className="rounded border border-amber-500/30 bg-background/60 px-2 py-1 text-xs font-mono text-foreground"
          >
            "{s}"
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Segmented control for choosing what to generate. Kept simple — three
 * mutually-exclusive options. `both` is default; `resume` and `cover` skip
 * the unrequested section in the AI prompt to save tokens.
 */
export type TailorMode = "both" | "resume" | "cover";

export function TailorModePicker({
  mode,
  onChange,
  disabled,
}: {
  mode: TailorMode;
  onChange: (m: TailorMode) => void;
  disabled?: boolean;
}) {
  const opts: { value: TailorMode; label: string }[] = [
    { value: "both", label: "Resume + cover letter" },
    { value: "resume", label: "Resume only" },
    { value: "cover", label: "Cover letter only" },
  ];
  return (
    <div className="inline-flex rounded-md border border-input p-0.5 text-xs">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={
            "rounded-sm px-3 py-1.5 font-medium transition-colors disabled:opacity-50 " +
            (mode === o.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Keep edited fields in sync when a new AI result arrives, but preserve user
 * edits across unrelated re-renders. Returns [value, setValue, resetToOriginal].
 */
export function useSyncedEditable(original: string): [string, (v: string) => void, () => void] {
  const [value, setValue] = useState(original);
  useEffect(() => {
    setValue(original);
  }, [original]);
  return [value, setValue, () => setValue(original)];
}
