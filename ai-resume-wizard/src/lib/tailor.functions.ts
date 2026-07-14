import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";
import { enforceUsage } from "./usage";


const TailorInput = z.object({
  jobDescription: z.string().min(30).max(20000),
  company: z.string().max(120).optional().default(""),
  role: z.string().max(160).optional().default(""),
});

export type TailorResult = {
  summary: string;
  bullets: { company: string; bullets: string[] }[];
  matchScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  coverLetter: string;
};

const SYSTEM = `You are an elite resume tailor. Rules:
- NEVER fabricate experience, employers, dates, or metrics. Only re-weight and reword what is already in the master resume.
- Prefer active verbs and quantified outcomes.
- Each bullet leads with the action and ends with the result.
- Preserve the same number of bullets per role (keep resume ~2 pages).
- Return ONLY valid JSON, no markdown, no commentary.`;

export const tailorResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TailorInput.parse(input))
  .handler(async ({ data, context }): Promise<TailorResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { data: row, error } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("No resume found. Visit /resume to add yours first.");
    const master = row.data as unknown as MasterResume;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const masterJson = JSON.stringify(
      {
        summary: master.summary,
        experience: (master.experience ?? []).map((e) => ({
          company: e.company,
          title: e.title,
          bullets: e.bullets,
        })),
      },
      null,
      2,
    );

    const companyList = (master.experience ?? []).map((e) => `"${e.company}"`).join(", ");

    const prompt = `MASTER RESUME (do not add anything not in here):
${masterJson}

TARGET ROLE:
Company: ${data.company || "(not specified)"}
Role: ${data.role || "(not specified)"}

JOB DESCRIPTION:
${data.jobDescription}

Return a JSON object with this exact shape:
{
  "summary": "2-3 sentence tailored professional summary emphasizing what this JD asks for",
  "bullets": [ { "company": "<one of ${companyList || "the master resume companies"}>", "bullets": ["...", "..."] } ],
  "matchScore": 0-100 integer,
  "matchedKeywords": ["skill1", "skill2"],
  "missingKeywords": ["skill3", "skill4"],
  "coverLetter": "3-paragraph cover letter, professional but human, referencing 1 specific thing about this role/company"
}

Include one entry in "bullets" per company in the master, in the same order, with the same number of bullets.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      prompt,
    });

    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: TailorResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI did not return valid JSON. Try again.");
      parsed = JSON.parse(match[0]);
    }

    // Persist to tailor_sessions so readiness dashboard + history survive across
    // devices. Best-effort — a persistence failure doesn't hide the result.
    try {
      await context.supabase.from("tailor_sessions").insert({
        user_id: context.userId,
        company: data.company || null,
        role: data.role || null,
        jd_text: data.jobDescription,
        tailored_resume: parsed as never,
        cover_letter: parsed.coverLetter,
      });
    } catch {
      // ignore
    }
    return parsed;
  });

const BatchInput = z.object({
  items: z.array(
    z.object({
      match_id: z.string().uuid().optional(),
      company: z.string().max(200).default(""),
      role: z.string().max(200).default(""),
      jobDescription: z.string().min(30).max(20000),
    }),
  ).min(1).max(20),
});

export type BatchTailorItemResult = {
  match_id?: string;
  company: string;
  role: string;
  session_id?: string;
  matchScore?: number;
  error?: string;
};

export const batchTailorResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BatchInput.parse(input))
  .handler(async ({ data, context }): Promise<{ results: BatchTailorItemResult[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { data: row, error } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("No resume on file. Visit /resume first.");
    const master = row.data as unknown as MasterResume;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const masterJson = JSON.stringify({
      summary: master.summary,
      experience: (master.experience ?? []).map((e) => ({
        company: e.company, title: e.title, bullets: e.bullets,
      })),
    });
    const companyList = (master.experience ?? []).map((e) => `"${e.company}"`).join(", ");

    const results: BatchTailorItemResult[] = [];
    for (const item of data.items) {
      try {
        const prompt = `MASTER RESUME:
${masterJson}

TARGET:
Company: ${item.company || "(not specified)"}
Role: ${item.role || "(not specified)"}

JOB DESCRIPTION:
${item.jobDescription}

Return JSON:
{
  "summary": "2-3 sentences",
  "bullets": [ { "company": "<one of ${companyList}>", "bullets": ["...", "..."] } ],
  "matchScore": 0-100,
  "matchedKeywords": ["..."],
  "missingKeywords": ["..."],
  "coverLetter": "3 paragraphs"
}`;
        const { text } = await generateText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM,
          prompt,
        });
        const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
        let parsed: TailorResult;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const m = cleaned.match(/\{[\s\S]*\}/);
          if (!m) throw new Error("AI returned invalid JSON");
          parsed = JSON.parse(m[0]);
        }

        const { data: inserted } = await context.supabase
          .from("tailor_sessions")
          .insert({
            user_id: context.userId,
            company: item.company || null,
            role: item.role || null,
            jd_text: item.jobDescription,
            tailored_resume: parsed as never,
            cover_letter: parsed.coverLetter,
          })
          .select("id")
          .single();

        results.push({
          match_id: item.match_id,
          company: item.company,
          role: item.role,
          session_id: inserted?.id,
          matchScore: parsed.matchScore,
        });
      } catch (e) {
        results.push({
          match_id: item.match_id,
          company: item.company,
          role: item.role,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }
    return { results };
  });
