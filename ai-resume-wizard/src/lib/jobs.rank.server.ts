// Rank fresh jobs against a user's resume:
//   1. Build a cheap keyword profile from the resume (title, competencies, recent bullets).
//   2. Pull ~500 most recently posted jobs from the shared pool.
//   3. Locally score each by keyword overlap (0 AI tokens). Keep top 40.
//   4. Send those 40 + resume snippet to the AI in ONE prompt, get back top 10 ranked.
//   5. Upsert winners into personal_matches with source='auto-weekly'.
//
// Total AI cost per user per run: 1 completion. Everything else is SQL/JS.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { MasterResume } from "./resume-data";
import type { JobListing } from "./jobs.functions";

const STOP = new Set([
  "the","a","an","of","and","or","for","in","on","at","to","with","by","as","is","are","be","from",
  "you","your","we","our","this","that","will","have","has","who","what","when","where","how","why",
  "role","job","position","team","teams","company","companies","work","working","across","using","use",
]);

function tokens(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#. -]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

function resumeKeywords(r: MasterResume): Set<string> {
  const bag: string[] = [];
  bag.push(...tokens(r.title));
  for (const c of r.competencies ?? []) bag.push(...tokens(c));
  for (const p of r.proficiencies ?? []) bag.push(...tokens(p.value));
  for (const exp of (r.experience ?? []).slice(0, 3)) {
    bag.push(...tokens(exp.title));
    for (const b of (exp.bullets ?? []).slice(0, 4)) bag.push(...tokens(b));
  }
  return new Set(bag);
}

function scoreJob(job: JobListing, kw: Set<string>): number {
  const hay = new Set([
    ...tokens(job.role),
    ...tokens(job.description).slice(0, 200), // cap description tokens
  ]);
  let overlap = 0;
  for (const t of hay) if (kw.has(t)) overlap += 1;
  // Small bonus for recency
  const days = job.posted_at
    ? (Date.now() - new Date(job.posted_at).getTime()) / (1000 * 60 * 60 * 24)
    : 30;
  const recency = Math.max(0, 14 - Math.min(14, days)) / 14; // 0..1
  return overlap + recency * 2;
}

export type RankSummary = {
  candidatesConsidered: number;
  shortlisted: number;
  inserted: number;
  skippedExisting: number;
  message: string;
};

export async function rankJobsForUser({
  supabase,
  userId,
  resume,
}: {
  supabase: SupabaseClient<Database>;
  userId: string;
  resume: MasterResume;
}): Promise<RankSummary> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  // Only look at jobs fetched in the last 21 days
  const cutoff = new Date(Date.now() - 21 * 86_400_000).toISOString();
  const { data: pool, error } = await supabase
    .from("job_listings")
    .select("id, company, role, location, url, description, remote, posted_at, fetched_at, source, source_id")
    .gte("fetched_at", cutoff)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  const jobs = (pool ?? []) as JobListing[];
  if (jobs.length === 0) {
    return { candidatesConsidered: 0, shortlisted: 0, inserted: 0, skippedExisting: 0, message: "Pool is empty — run refresh first." };
  }

  const kw = resumeKeywords(resume);
  const scored = jobs
    .map((j) => ({ j, s: scoreJob(j, kw) }))
    .filter((x) => x.s > 1) // at least one strong overlap
    .sort((a, b) => b.s - a.s)
    .slice(0, 40);

  if (scored.length === 0) {
    return {
      candidatesConsidered: jobs.length,
      shortlisted: 0,
      inserted: 0,
      skippedExisting: 0,
      message: "No jobs matched your resume keywords. Add more watched companies or refresh the pool.",
    };
  }

  // Exclude jobs the user has already saved to matches (any status).
  const { data: existing } = await supabase
    .from("personal_matches")
    .select("job_listing_id")
    .eq("user_id", userId)
    .not("job_listing_id", "is", null);
  const alreadySaved = new Set(
    ((existing ?? []) as Array<{ job_listing_id: string | null }>)
      .map((r) => r.job_listing_id)
      .filter((x): x is string => !!x),
  );
  const shortlist = scored.filter((x) => !alreadySaved.has(x.j.id));

  if (shortlist.length === 0) {
    return {
      candidatesConsidered: jobs.length,
      shortlisted: 0,
      inserted: 0,
      skippedExisting: scored.length,
      message: "Every keyword-matching job is already in your matches.",
    };
  }

  // Build a compact prompt with numbered candidates. Ask AI to return the top 10 indices + reason.
  const numbered = shortlist.map((x, i) => {
    const desc = (x.j.description ?? "").slice(0, 300);
    return `#${i} | ${x.j.company} | ${x.j.role} | ${x.j.location ?? "—"}${x.j.remote ? " (remote)" : ""}\n${desc}`;
  }).join("\n---\n");

  const resumeSnippet = JSON.stringify({
    title: resume.title,
    summary: (resume.summary ?? "").slice(0, 500),
    competencies: (resume.competencies ?? []).slice(0, 12),
    recent: (resume.experience ?? []).slice(0, 2).map((e) => ({ title: e.title, company: e.company })),
  });

  const prompt = `CANDIDATE:
${resumeSnippet}

CANDIDATE_JOBS (${shortlist.length} pre-filtered):
${numbered}

Return valid JSON only, exactly:
{"picks":[{"index":0,"why":"one-sentence fit"}]}

Pick the 10 (or fewer if pool is smaller) best fits based on real overlap with the candidate's experience and seniority. Prefer roles the candidate is plausibly qualified for. Do not fabricate — only pick from the provided list. "index" refers to the # in CANDIDATE_JOBS.`;

  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: "You rank job postings against a candidate resume. Return strict JSON only.",
    prompt,
  });

  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  let parsed: { picks: Array<{ index: number; why?: string }> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Model returned invalid JSON");
    parsed = JSON.parse(m[0]);
  }

  const picks = (parsed.picks ?? [])
    .filter((p) => typeof p.index === "number" && p.index >= 0 && p.index < shortlist.length)
    .slice(0, 10);

  if (picks.length === 0) {
    return {
      candidatesConsidered: jobs.length,
      shortlisted: shortlist.length,
      inserted: 0,
      skippedExisting: alreadySaved.size,
      message: "AI returned no picks.",
    };
  }

  const rows = picks.map((p) => {
    const j = shortlist[p.index].j;
    return {
      user_id: userId,
      company: j.company,
      role: j.role,
      location: j.location,
      role_url: j.url,
      notes: p.why ? `Auto-suggested: ${p.why.slice(0, 400)}` : null,
      job_listing_id: j.id,
      source: "auto-weekly",
      status: "saved",
    };
  });

  const { error: insErr } = await supabase.from("personal_matches").insert(rows as never);
  if (insErr) throw insErr;

  return {
    candidatesConsidered: jobs.length,
    shortlisted: shortlist.length,
    inserted: rows.length,
    skippedExisting: alreadySaved.size,
    message: `Added ${rows.length} auto-suggested matches.`,
  };
}
