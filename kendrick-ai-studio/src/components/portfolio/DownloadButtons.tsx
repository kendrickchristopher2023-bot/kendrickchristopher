import { useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadButtons({
  onPdf,
  onDocx,
  label,
}: {
  onPdf: () => Promise<void>;
  onDocx: () => Promise<void>;
  label: string;
}) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);

  const run = (kind: "pdf" | "docx", fn: () => Promise<void>) => async () => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (error) {
      console.error("Document generation failed", error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        variant="hero"
        size="xl"
        onClick={run("pdf", onPdf)}
        disabled={busy !== null}
        aria-label={`Download ${label} as PDF`}
      >
        {busy === "pdf" ? <Loader2 className="animate-spin" /> : <FileDown />}
        Download PDF
      </Button>
      <Button
        type="button"
        variant="outlineGlow"
        size="xl"
        onClick={run("docx", onDocx)}
        disabled={busy !== null}
        aria-label={`Download ${label} as DOCX`}
      >
        {busy === "docx" ? <Loader2 className="animate-spin" /> : <FileText />}
        Download DOCX
      </Button>
    </div>
  );
}