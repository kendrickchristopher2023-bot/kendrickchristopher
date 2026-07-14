import type { LintFinding } from "@/lib/ats-lint";
import { lintSummary } from "@/lib/ats-lint";

export function AtsLintPanel({ findings }: { findings: LintFinding[] }) {
  const s = lintSummary(findings);
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Resume-screening compatibility check
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive font-semibold">{s.errors}</span> issues ·{" "}
          <span className="text-amber-600 dark:text-amber-500 font-semibold">{s.warns}</span> warnings ·{" "}
          <span className="text-emerald-600 dark:text-emerald-500 font-semibold">{s.oks}</span> ok
        </p>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {findings.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Badge level={f.level} />
            <span className="text-foreground">
              {f.message}
              {f.field && <span className="ml-1 text-muted-foreground">({f.field})</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Formatting diagnostics only — no invisible keywords, hidden text, or content tricks.
      </p>
    </div>
  );
}

function Badge({ level }: { level: LintFinding["level"] }) {
  const cls =
    level === "error"
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : level === "warn"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40"
        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40";
  const label = level === "error" ? "FIX" : level === "warn" ? "WARN" : "OK";
  return (
    <span className={`shrink-0 mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
