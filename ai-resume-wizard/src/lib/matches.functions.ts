import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

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
});

export const addMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data, context }): Promise<PersonalMatch> => {
    const payload = {
      user_id: context.userId,
      company: data.company,
      role: data.role,
      location: data.location || null,
      tier: data.tier || null,
      role_url: data.role_url || null,
      notes: data.notes || null,
    };
    const { data: row, error } = await context.supabase
      .from("personal_matches")
      .insert(payload)
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
    z.object({ prompt: z.string().min(3).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ suggestions: Suggestion[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

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

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `CANDIDATE:
${resumeSnippet}

USER PROMPT (industries/locations/level):
${data.prompt}

Return JSON exactly:
{
  "suggestions": [
    { "company": "string", "role": "string", "location": "string", "careers_url": "https://...", "why": "1 sentence why this fits" }
  ]
}
Return 10-15 diverse suggestions.`;

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
