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
};

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
