import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";
import { enforceUsage } from "./usage";


export type PersonalMatch = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  location: string | null;
  tier: string | null;
  role_url: string | null;
  notes: string | null;
  created_at: string;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  job_listing_id: string | null;
};

export type MatchPrefill = {
  company: string;
  role: string;
  jobDescription: string | null;
  source: "job_listing" | "tailor_session" | null;
};

export const getMatchPrefill = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<MatchPrefill | null> => {
    const { data: match, error } = await context.supabase
      .from("personal_matches")
      .select("company, role, job_listing_id")
      .eq("id", data.matchId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!match) return null;

    let jd: string | null = null;
    let source: MatchPrefill["source"] = null;

    if (match.job_listing_id) {
      const { data: jl } = await context.supabase
        .from("job_listings")
        .select("description")
        .eq("id", match.job_listing_id)
        .maybeSingle();
      if (jl?.description && jl.description.trim().length >= 30) {
        jd = jl.description;
        source = "job_listing";
      }
    }

    if (!jd) {
      const { data: sess } = await context.supabase
        .from("tailor_sessions")
        .select("jd_text, created_at")
        .eq("user_id", context.userId)
        .ilike("company", match.company)
        .ilike("role", match.role)
        .not("jd_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sess?.jd_text && sess.jd_text.trim().length >= 30) {
        jd = sess.jd_text;
        source = "tailor_session";
      }
    }

    return {
      company: match.company,
      role: match.role,
      jobDescription: jd,
      source,
    };
  });

export type ApplyContext = {
  match: PersonalMatch;
  jobDescription: string | null;
  jdSource: "job_listing" | "tailor_session" | null;
  salary: {
    min: number | null;
    max: number | null;
    currency: string | null;
    period: string | null;
  } | null;
  experienceLevel: string | null;
  remote: boolean | null;
  postingUrl: string | null;
  applied: boolean;
  stack: { ids: string[]; index: number; prevId: string | null; nextId: string | null };
};

function normLower(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

export const getApplyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ matchId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ApplyContext | null> => {
    const { data: match, error } = await context.supabase
      .from("personal_matches")
      .select("*")
      .eq("id", data.matchId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!match) return null;
    const m = match as PersonalMatch;

    let jd: string | null = null;
    let jdSource: "job_listing" | "tailor_session" | null = null;
    let salary: ApplyContext["salary"] = null;
    let experienceLevel: string | null = null;
    let remote: boolean | null = null;
    let postingUrl: string | null = m.role_url ?? null;

    if (m.job_listing_id) {
      const { data: jl } = await context.supabase
        .from("job_listings")
        .select("description, salary_min, salary_max, salary_currency, salary_period, experience_level, remote, url")
        .eq("id", m.job_listing_id)
        .maybeSingle();
      if (jl) {
        if (jl.description && jl.description.trim().length >= 30) {
          jd = jl.description;
          jdSource = "job_listing";
        }
        if (jl.salary_min || jl.salary_max) {
          salary = {
            min: jl.salary_min,
            max: jl.salary_max,
            currency: jl.salary_currency,
            period: jl.salary_period,
          };
        }
        experienceLevel = jl.experience_level;
        remote = jl.remote;
        if (!postingUrl) postingUrl = jl.url;
      }
    }

    if (!jd) {
      const { data: sess } = await context.supabase
        .from("tailor_sessions")
        .select("jd_text")
        .eq("user_id", context.userId)
        .ilike("company", m.company)
        .ilike("role", m.role)
        .not("jd_text", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sess?.jd_text && sess.jd_text.trim().length >= 30) {
        jd = sess.jd_text;
        jdSource = "tailor_session";
      }
    }

    // Build stack of un-applied matches (excluding current only if applied).
    const [{ data: allMatches }, { data: allApps }] = await Promise.all([
      context.supabase
        .from("personal_matches")
        .select("id, company, role, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("applications")
        .select("company, role")
        .eq("user_id", context.userId),
    ]);
    const appliedKeys = new Set(
      (allApps ?? []).map((a) => `${normLower(a.company)}::${normLower(a.role)}`),
    );
    const currentApplied = appliedKeys.has(`${normLower(m.company)}::${normLower(m.role)}`);
    const stackIds = (allMatches ?? [])
      .filter((r) => {
        const key = `${normLower(r.company)}::${normLower(r.role)}`;
        if (r.id === m.id) return true; // keep current in stack for context
        return !appliedKeys.has(key);
      })
      .map((r) => r.id);
    const idx = stackIds.indexOf(m.id);
    const prevId = idx > 0 ? stackIds[idx - 1] : null;
    const nextId = idx >= 0 && idx < stackIds.length - 1 ? stackIds[idx + 1] : null;

    return {
      match: m,
      jobDescription: jd,
      jdSource,
      salary,
      experienceLevel,
      remote,
      postingUrl,
      applied: currentApplied,
      stack: { ids: stackIds, index: idx, prevId, nextId },
    };
  });

export const getNextUnappliedMatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ matchId: string | null; total: number }> => {
    const [{ data: allMatches }, { data: allApps }] = await Promise.all([
      context.supabase
        .from("personal_matches")
        .select("id, company, role")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("applications")
        .select("company, role")
        .eq("user_id", context.userId),
    ]);
    const appliedKeys = new Set(
      (allApps ?? []).map((a) => `${normLower(a.company)}::${normLower(a.role)}`),
    );
    const unapplied = (allMatches ?? []).filter(
      (r) => !appliedKeys.has(`${normLower(r.company)}::${normLower(r.role)}`),
    );
    return { matchId: unapplied[0]?.id ?? null, total: unapplied.length };
  });

export const listMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PersonalMatch[]> => {
    const { data, error } = await context.supabase
      .from("personal_matches")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PersonalMatch[];
  });

const MatchInput = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  location: z.string().max(200).optional().nullable(),
  tier: z.string().max(50).optional().nullable(),
  role_url: z.string().url().optional().nullable().or(z.literal("")),
  notes: z.string().max(2000).optional().nullable(),
  zip_code: z.string().max(20).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
});

function normalizeLocPatch(data: z.infer<typeof MatchInput>) {
  return {
    location: data.location || null,
    tier: data.tier || null,
    role_url: data.role_url || null,
    notes: data.notes || null,
    zip_code: data.zip_code || null,
    city: data.city || null,
    state: data.state || null,
    country: data.country || null,
  };
}

export const addMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data, context }): Promise<PersonalMatch> => {
    const payload = {
      user_id: context.userId,
      company: data.company,
      role: data.role,
      ...normalizeLocPatch(data),
    };
    const { data: row, error } = await context.supabase
      .from("personal_matches")
      .insert(payload as never)
      .select("*")
      .single();
    if (error) throw error;
    return row as PersonalMatch;
  });

export const updateMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).merge(MatchInput.partial()).parse(input),
  )
  .handler(async ({ data, context }): Promise<PersonalMatch> => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("personal_matches")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return row as PersonalMatch;
  });

export const deleteMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("personal_matches")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// US-only ZIP radius lookup. Returns the set of ZIP codes within `radius_miles`
// of the given ZIP, using an embedded offline dataset (no external API).
export const nearbyZipCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        zip: z.string().min(3).max(20),
        radius_miles: z.number().int().min(0).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ zips: string[] }> => {
    const { nearbyZips } = await import("./zipcodes.server");
    return { zips: nearbyZips(data.zip, data.radius_miles) };
  });

export type Suggestion = {
  company: string;
  role: string;
  location: string;
  careers_url: string;
  why: string;
};

const SUGGEST_SYSTEM = `You are a job search researcher. Propose real companies + realistic role titles that match the candidate's background and the prompt. Return valid JSON only. Never fabricate exact job openings — careers_url should be the company's careers homepage. Prefer companies the candidate is plausibly qualified for.`;

export const suggestMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().max(2000).optional().default(""),
        city: z.string().max(120).optional(),
        state: z.string().max(120).optional(),
        country: z.string().max(120).optional(),
        zip_code: z.string().max(20).optional(),
        radius_miles: z.number().int().min(0).max(500).optional(),
      })
      .refine(
        (v) =>
          (v.prompt && v.prompt.trim().length >= 3) ||
          v.city ||
          v.state ||
          v.country ||
          v.zip_code,
        { message: "Provide a prompt or at least one location field." },
      )
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ suggestions: Suggestion[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    await enforceUsage(context.supabase, context.userId, "tailor");


    const { data: row } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    const resume = row?.data as unknown as MasterResume | undefined;

    const resumeSnippet = resume
      ? JSON.stringify({
          title: resume.title,
          summary: resume.summary,
          competencies: resume.competencies,
          experience: (resume.experience ?? []).map((e) => ({
            title: e.title,
            company: e.company,
          })),
        })
      : "(no resume on file — infer from prompt only)";

    const locationBlock = [
      data.city && `city: ${data.city}`,
      data.state && `state/region: ${data.state}`,
      data.country && `country: ${data.country}`,
      data.zip_code &&
        `zip: ${data.zip_code}${data.radius_miles ? ` (within ${data.radius_miles} miles)` : ""}`,
    ]
      .filter(Boolean)
      .join("\n");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `CANDIDATE:
${resumeSnippet}

${locationBlock ? `TARGET LOCATION (structured):\n${locationBlock}\n\n` : ""}USER PROMPT (industries/level/other):
${data.prompt || "(none — use structured location + resume)"}

Return JSON exactly:
{
  "suggestions": [
    { "company": "string", "role": "string", "location": "string", "careers_url": "https://...", "why": "1 sentence why this fits" }
  ]
}
Prefer companies with offices or remote-eligible roles in the target location when one is provided. Return 10-15 diverse suggestions.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SUGGEST_SYSTEM,
      prompt,
    });
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    let parsed: { suggestions: Suggestion[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI did not return valid JSON.");
      parsed = JSON.parse(m[0]);
    }
    return { suggestions: (parsed.suggestions ?? []).slice(0, 20) };
  });
