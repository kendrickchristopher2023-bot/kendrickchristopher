import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

export type { MasterResume } from "./resume-data";

export const getMyResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ resume: MasterResume | null; id: string | null }> => {
    const { data, error } = await context.supabase
      .from("resumes")
      .select("id, data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { resume: null, id: null };
    return { resume: data.data as unknown as MasterResume, id: data.id };
  });

export const saveMyResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resume: unknown }) =>
    z.object({ resume: z.record(z.string(), z.unknown()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("resumes")
      .select("id")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("resumes")
        .update({ data: data.resume as never, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true, id: existing.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("resumes")
      .insert({ user_id: context.userId, data: data.resume as never, is_primary: true })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: inserted.id };
  });

const EXTRACT_SYSTEM = `You are a resume parser. Extract the user's resume from raw text (resume paste, LinkedIn "About", etc.) into strict JSON. Never invent employers, dates, or metrics — leave fields empty ("" or []) if unknown. Return ONLY valid JSON, no markdown, no commentary.`;

export const extractResumeFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) =>
    z.object({ text: z.string().min(30).max(30000) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ resume: MasterResume }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Extract the following resume text into this exact JSON schema. If a field is unknown, use "" for strings or [] for arrays. Do NOT invent content.

Schema:
{
  "name": "string",
  "title": "string (current or target job title)",
  "email": "string",
  "phone": "string",
  "location": "string",
  "github": "string (host+path, no protocol) or ''",
  "linkedin": "string (host+path, no protocol) or ''",
  "summary": "string (2-4 sentences)",
  "competencies": ["string", "..."],
  "experience": [
    { "title": "string", "company": "string", "location": "string", "dates": "string", "bullets": ["string", "..."] }
  ],
  "additionalExperience": ["string", "..."],
  "proficiencies": [{ "label": "string", "value": "string" }],
  "education": { "degree": "string", "school": "string" },
  "certifications": ["string", "..."],
  "projects": [{ "title": "string", "stack": "string", "outcome": "string", "href": "string?" }],
  "lastUpdated": "${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}"
}

RESUME TEXT:
${data.text}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: EXTRACT_SYSTEM,
      prompt,
    });

    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    let parsed: MasterResume;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI did not return valid JSON. Try pasting more detail.");
      parsed = JSON.parse(m[0]);
    }
    return { resume: parsed };
  });
