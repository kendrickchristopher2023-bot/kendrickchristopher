import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, errorResult, requireAuth, supabaseAsUser, textResult } from "../_helpers";

export default defineTool({
  name: "generate_cover_letter",
  title: "Generate a cover letter",
  description: "Write a 3-paragraph cover letter for a specific JD, grounded in the user's stored resume.",
  inputSchema: {
    job_description: z.string().min(30).max(20000),
    company: z.string().max(200).optional(),
    role: z.string().max(200).optional(),
    tone: z.string().max(50).optional().describe("e.g. warm, formal, direct (default: warm-professional)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ job_description, company, role, tone }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data: resume, error } = await supabase
      .from("resumes")
      .select("data")
      .eq("is_primary", true)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!resume) return errorResult("No resume found. Call update_resume first.");

    const text = await callGateway(
      `USER RESUME:\n${JSON.stringify(resume.data)}\n\nJOB:\nCompany: ${company ?? ""}\nRole: ${role ?? ""}\n\n${job_description}\n\nWrite a ${tone ?? "warm, professional"} 3-paragraph cover letter. Reference one specific detail about the company/role. No fabrication. Return only the letter.`,
    );
    return textResult(text.trim());
  },
});
