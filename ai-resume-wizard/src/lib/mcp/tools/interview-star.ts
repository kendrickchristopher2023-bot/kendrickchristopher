import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, errorResult, requireAuth, supabaseAsUser, textResult } from "../_helpers";

export default defineTool({
  name: "interview_prep_star",
  title: "Interview prep — STAR answers",
  description:
    "Generate STAR-format answers to likely interview questions for a JD, drawn from the user's real resume experience.",
  inputSchema: {
    job_description: z.string().min(30).max(20000),
    questions: z.array(z.string().min(3).max(500)).max(20).optional().describe("Specific questions; if empty, top 6 are inferred from the JD."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ job_description, questions }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data: resume, error } = await supabase.from("resumes").select("data").eq("is_primary", true).maybeSingle();
    if (error) return errorResult(error.message);
    if (!resume) return errorResult("No resume found. Call update_resume first.");

    const text = await callGateway(
      `You are an interview coach. Using ONLY the candidate's real experience below, write STAR (Situation, Task, Action, Result) answers.

Resume: ${JSON.stringify(resume.data)}
Job description: ${job_description}
Questions: ${questions?.length ? JSON.stringify(questions) : "Infer the 6 most likely behavioral + technical questions for this JD."}

For each question return markdown:
### Q: <question>
- **S:** ...
- **T:** ...
- **A:** ...
- **R:** ...

Keep each answer under 180 words. Never fabricate facts.`,
    );
    return textResult(text.trim());
  },
});
