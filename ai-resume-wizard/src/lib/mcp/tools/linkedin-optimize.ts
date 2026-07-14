import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, checkUsageOrReturnError, errorResult, requireAuth, supabaseAsUser, textResult } from "../_helpers";

export default defineTool({
  name: "linkedin_optimize",
  title: "Optimize my LinkedIn",
  description:
    "Suggest concrete edits to the user's LinkedIn headline, About, and top-role bullets, targeted at a role/keywords, grounded in their resume.",
  inputSchema: {
    target_role: z.string().min(1).max(200),
    target_keywords: z.string().max(1000).optional().describe("Comma-separated keywords to weight (e.g. 'forward deployed, AI enablement')."),
    current_headline: z.string().max(220).optional(),
    current_about: z.string().max(4000).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ target_role, target_keywords, current_headline, current_about }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data: resume, error } = await supabase.from("resumes").select("data").eq("is_primary", true).maybeSingle();
    if (error) return errorResult(error.message);

    const text = await callGateway(
      `You are a LinkedIn profile optimizer for tech candidates.
Resume: ${JSON.stringify(resume?.data ?? {})}
Target role: ${target_role}
Keywords: ${target_keywords ?? "(none specified)"}
Current headline: ${current_headline ?? "(unknown)"}
Current About: ${current_about ?? "(unknown)"}

Return markdown with sections:
## Headline (3 variants, max 220 chars each)
## About (rewritten, 3-4 short paragraphs, first person)
## Top-role bullets (3-5 improved bullets for their most recent role)
## Skills to add (comma-separated)
## Keywords density notes

No fabrication.`,
    );
    return textResult(text.trim());
  },
});
