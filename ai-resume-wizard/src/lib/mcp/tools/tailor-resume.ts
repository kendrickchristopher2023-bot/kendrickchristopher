import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

const SYSTEM = `You are an elite resume tailor for AI/tech roles. Never fabricate experience, employers, dates, or metrics — only reweight and reword what's already in the user's resume. Prefer active verbs, quantified outcomes. Return ONLY valid JSON, no markdown.`;

export default defineTool({
  name: "tailor_resume",
  title: "Tailor resume to a job description",
  description:
    "Rewrite the user's stored resume for a specific JD. Returns a tailored summary, per-role bullets, match score, matched/missing keywords, and a cover-letter draft.",
  inputSchema: {
    job_description: z.string().min(30).max(20000),
    company: z.string().max(200).optional(),
    role: z.string().max(200).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ job_description, company, role }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data: resume, error } = await supabase
      .from("resumes")
      .select("data")
      .eq("is_primary", true)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!resume) return errorResult("No resume found. Call update_resume first.");

    const prompt = `MASTER RESUME (do not add anything not in here):
${JSON.stringify(resume.data, null, 2)}

TARGET:
Company: ${company || "(not specified)"}
Role: ${role || "(not specified)"}

JOB DESCRIPTION:
${job_description}

Return a JSON object:
{
  "summary": "2-3 sentence tailored professional summary",
  "bullets": [{ "company": "...", "bullets": ["...", "..."] }],
  "matchScore": 0-100 integer,
  "matchedKeywords": ["..."],
  "missingKeywords": ["..."],
  "coverLetter": "3-paragraph cover letter"
}`;

    const text = await callGateway(prompt, SYSTEM);
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    try {
      return jsonResult(JSON.parse(cleaned));
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return errorResult("AI returned invalid JSON");
      return jsonResult(JSON.parse(m[0]));
    }
  },
});
