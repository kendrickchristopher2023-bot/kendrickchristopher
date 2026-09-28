// Detect applicant-instruction text embedded in third-party job descriptions
// (e.g. RemoteOK's "please mention the word X" spam-check). Shared client + server.
//
// We DO NOT use this to sanitize what the AI outputs — the model prompt is
// hardened separately. This is only for surfacing an honest notice to the
// human: "this post asks you to include X, we deliberately left it out."

const PATTERNS: RegExp[] = [
  /please\s+mention\s+the\s+word[^.\n]{0,200}/gi,
  /to\s+show\s+you\s+read\s+the\s+job\s+post[^.\n]{0,200}/gi,
  /include\s+the\s+(word|phrase|code)[^.\n]{0,200}/gi,
];

export type InjectionInfo = { detected: boolean; snippets: string[] };

export function detectApplicantInstructions(jd: string | null | undefined): InjectionInfo {
  if (!jd) return { detected: false, snippets: [] };
  const snippets: string[] = [];
  for (const re of PATTERNS) {
    for (const m of jd.matchAll(re)) {
      const s = m[0].trim().replace(/\s+/g, " ");
      if (s && !snippets.includes(s)) snippets.push(s);
    }
  }
  return { detected: snippets.length > 0, snippets: snippets.slice(0, 3) };
}
