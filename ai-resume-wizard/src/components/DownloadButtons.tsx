// Shared download buttons. Posts to /api/export and triggers a browser
// download. Every screen that generates content can drop this in.

import { useState } from "react";
import { sanitizeFilename } from "@/lib/csv";

export type ExportSection = {
  heading?: string;
  body?: string;
  items?: string[];
  kv?: { label: string; value: string }[];
};

type DocPayload = {
  filename: string;
  title?: string;
  subtitle?: string;
  sections: ExportSection[];
};

type CsvPayload = {
  filename: string;
  headers: string[];
  rows: (string | number | null)[][];
};

async function download(format: "pdf" | "docx" | "csv", body: unknown) {
  const res = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format, ...(body as object) }),
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status} ${await res.text()}`);
  const blob = await res.blob();
  const dispo = res.headers.get("Content-Disposition") || "";
  const m = dispo.match(/filename="([^"]+)"/);
  const filename = m?.[1] ?? "download";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTextFile(filename: string, text: string) {
  const safe = sanitizeFilename(filename).endsWith(".txt")
    ? sanitizeFilename(filename)
    : `${sanitizeFilename(filename)}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = {
  /** Called each time a button is clicked — return the fresh payload based on current on-screen state. */
  build: () => DocPayload;
  /** Show only when true — hide until content exists. */
  ready: boolean;
  className?: string;
};

export function DownloadButtons({ build, ready, className }: Props) {
  const [busy, setBusy] = useState<null | "pdf" | "docx">(null);
  const [err, setErr] = useState<string | null>(null);
  if (!ready) return null;

  const go = async (format: "pdf" | "docx") => {
    setBusy(format); setErr(null);
    try { await download(format, build()); }
    catch (e) { setErr(e instanceof Error ? e.message : "Download failed"); }
    finally { setBusy(null); }
  };

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
      <button
        onClick={() => go("pdf")}
        disabled={busy !== null}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {busy === "pdf" ? "Preparing…" : "Download PDF"}
      </button>
      <button
        onClick={() => go("docx")}
        disabled={busy !== null}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {busy === "docx" ? "Preparing…" : "Download Word (.docx)"}
      </button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}

type CsvProps = {
  build: () => CsvPayload;
  ready: boolean;
  label?: string;
  className?: string;
};

export function CsvDownloadButton({ build, ready, label = "Export CSV", className }: CsvProps) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!ready) return null;
  return (
    <div className={className ?? "inline-flex items-center gap-2"}>
      <button
        onClick={async () => {
          setBusy(true); setErr(null);
          try { await download("csv", build()); }
          catch (e) { setErr(e instanceof Error ? e.message : "Export failed"); }
          finally { setBusy(false); }
        }}
        disabled={busy}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {busy ? "Preparing…" : label}
      </button>
      {err && <span className="text-xs text-destructive">{err}</span>}
    </div>
  );
}

type TxtProps = { text: string; filename: string; label?: string; className?: string };
export function TxtDownloadButton({ text, filename, label = "Download .txt", className }: TxtProps) {
  if (!text) return null;
  return (
    <button
      onClick={() => downloadTextFile(filename, text)}
      className={className ?? "text-xs text-muted-foreground hover:text-foreground underline"}
    >
      {label}
    </button>
  );
}
