// Shared client-side download helpers for tailored resumes and cover letters.
// The apply results page and the application history page both call these, so
// the request shape for /api/tailored-resume, /api/resume-docx,
// /api/cover-letter-pdf and /api/cover-letter-docx lives in exactly one place.

import type { MasterResume } from "./resume-data";

export type TailoredBulletGroup = { company: string; title?: string; bullets: string[] };

const slug = (s: string) => s.replace(/[^a-z0-9]/gi, "_");

async function postAndSave(url: string, body: unknown, filename: string, label: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${label} failed (${res.status})`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/** Rebuilds the tailored resume request from the current master resume plus saved tailored content. */
export async function downloadTailoredResume(opts: {
  kind: "pdf" | "docx";
  resume: MasterResume;
  summary: string;
  bullets: TailoredBulletGroup[];
  company: string;
  role: string;
}) {
  const { kind, resume, summary, bullets, company, role } = opts;
  const url = kind === "pdf" ? "/api/tailored-resume" : "/api/resume-docx";
  const base = slug(resume.name || "Resume");
  const filename = company
    ? `${base}_Resume_${slug(company)}.${kind}`
    : `${base}_Resume_Tailored.${kind}`;
  await postAndSave(
    url,
    { resume, summary, bullets, company, role },
    filename,
    `${kind.toUpperCase()} generation`,
  );
}

export async function downloadCoverLetterFile(opts: {
  kind: "pdf" | "docx";
  resume: MasterResume;
  coverLetter: string;
  company: string;
  role: string;
}) {
  const { kind, resume, coverLetter, company, role } = opts;
  const url = kind === "pdf" ? "/api/cover-letter-pdf" : "/api/cover-letter-docx";
  const base = slug(resume.name || "Cover_Letter");
  const filename = company
    ? `${base}_Cover_Letter_${slug(company)}.${kind}`
    : `${base}_Cover_Letter.${kind}`;
  await postAndSave(
    url,
    {
      sender: {
        name: resume.name || "",
        email: resume.email || "",
        phone: resume.phone || "",
        location: resume.location || "",
      },
      company,
      role,
      coverLetter,
    },
    filename,
    `Cover letter ${kind.toUpperCase()}`,
  );
}
