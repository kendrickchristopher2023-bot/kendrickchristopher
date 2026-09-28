import type { MasterResume } from "./resume-data";

export type LintLevel = "ok" | "warn" | "error";
export type LintFinding = {
  level: LintLevel;
  code: string;
  message: string;
  field?: string;
};

// Formatting-only diagnostics. Never returns advice that would hide text,
// stuff invisible keywords, or otherwise manipulate an AI screener.
export function lintResumeForAts(resume: MasterResume | null | undefined): LintFinding[] {
  const out: LintFinding[] = [];
  if (!resume) {
    return [{ level: "error", code: "no-resume", message: "No resume on file. Add one on /resume." }];
  }

  // Contact info parseability — ATS parsers pull these from the body, not from
  // a page header/footer. Our exports already inline them; flag when missing.
  if (!resume.name?.trim()) out.push({ level: "error", code: "missing-name", message: "Full name is missing.", field: "name" });
  if (!resume.email?.trim()) out.push({ level: "error", code: "missing-email", message: "Email is missing — most ATS won't parse a resume without one.", field: "email" });
  if (!resume.phone?.trim()) out.push({ level: "warn", code: "missing-phone", message: "Phone number is missing.", field: "phone" });
  if (!resume.location?.trim()) out.push({ level: "warn", code: "missing-location", message: "Location is missing — some ATS filter by city/state.", field: "location" });

  // Standard section headers ATS parsers look for.
  if (!resume.summary?.trim()) out.push({ level: "warn", code: "missing-summary", message: "No professional summary. Add 2–3 sentences at the top.", field: "summary" });
  if (!resume.experience || resume.experience.length === 0) out.push({ level: "error", code: "no-experience", message: "Experience section is empty.", field: "experience" });
  if (!resume.education?.degree && !resume.education?.school) out.push({ level: "warn", code: "no-education", message: "Education section is empty.", field: "education" });
  if (!resume.competencies || resume.competencies.length === 0) out.push({ level: "warn", code: "no-skills", message: "No skills/competencies listed — recruiters and ATS both scan this section.", field: "competencies" });

  // Non-standard bullet characters commonly break parsers. Our exports use
  // real hyphens/•; flag any stored bullets that use decorative glyphs.
  const badBullet = /[▪◆★✦→»➤✓✔◇◉●▶►]/;
  const longBullets: string[] = [];
  let badBulletCount = 0;
  (resume.experience ?? []).forEach((exp) => {
    (exp.bullets ?? []).forEach((b) => {
      if (badBullet.test(b)) badBulletCount++;
      const words = b.trim().split(/\s+/).length;
      if (words > 45) longBullets.push(`${exp.company}: "${b.slice(0, 60)}…"`);
    });
  });
  if (badBulletCount > 0) {
    out.push({
      level: "warn",
      code: "decorative-bullets",
      message: `${badBulletCount} bullet(s) use decorative characters (▪◆★ etc.). Use plain "•" or "-" — safer for ATS parsers.`,
    });
  }
  if (longBullets.length > 0) {
    out.push({
      level: "warn",
      code: "long-bullets",
      message: `${longBullets.length} bullet(s) exceed ~45 words. Split long run-ons so parsers keep them as distinct achievements.`,
    });
  }

  // Layout notes: our PDF/DOCX exports are single-column, standard headings,
  // selectable text — assert here so future export changes get audited.
  out.push({
    level: "ok",
    code: "layout-single-column",
    message: "Exports use a single-column layout with standard section headings — ATS-parser friendly.",
  });
  out.push({
    level: "ok",
    code: "contact-in-body",
    message: "Contact info is rendered in the document body (not only header/footer) so parsers reliably capture it.",
  });

  return out;
}

export function lintSummary(findings: LintFinding[]): { errors: number; warns: number; oks: number } {
  return {
    errors: findings.filter((f) => f.level === "error").length,
    warns: findings.filter((f) => f.level === "warn").length,
    oks: findings.filter((f) => f.level === "ok").length,
  };
}
