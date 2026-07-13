import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

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
    return parsed;
  });
