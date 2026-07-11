import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { RESUME } from "./resume-data";

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

const SYSTEM = `You are an elite resume tailor for AI Deployment / Forward Deployed Engineer / Customer Engineer roles at frontier AI companies (OpenAI, Anthropic, Lovable, Cursor, etc.).

Rules:
- NEVER fabricate experience, employers, dates, or metrics. Only re-weight and reword what is already in the master resume.
- Prefer active verbs and quantified outcomes.
- Each bullet must lead with the action and end with the result.
- Preserve the same number of bullets per role (keep the resume 2 pages).
- Return ONLY valid JSON matching the requested schema. No markdown, no commentary.`;

export const tailorResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TailorInput.parse(input))
  .handler(async ({ data }): Promise<TailorResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const masterJson = JSON.stringify(
      {
        summary: RESUME.summary,
        experience: RESUME.experience.map((e) => ({
          company: e.company,
          title: e.title,
          bullets: e.bullets,
        })),
      },
      null,
      2,
    );

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
  "bullets": [
    { "company": "Mews PMS", "bullets": ["...", "..."] },
    { "company": "PurpleCloud Technologies", "bullets": ["...", "..."] },
    { "company": "Amadeus", "bullets": ["...", "..."] }
  ],
  "matchScore": 0-100 integer estimating how well this candidate matches the JD,
  "matchedKeywords": ["skill1", "skill2"],
  "missingKeywords": ["skill3", "skill4"],
  "coverLetter": "3-paragraph cover letter, professional but human, referencing 1 specific thing about this role/company"
}

Keep the same company order and same number of bullets per company as the master. Use the exact company names above.`;

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: SYSTEM,
      prompt,
    });

    // Extract JSON (strip any accidental code fences)
    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: TailorResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to find the first {...} block
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI did not return valid JSON. Try again.");
      parsed = JSON.parse(match[0]);
    }
    return parsed;
  });
