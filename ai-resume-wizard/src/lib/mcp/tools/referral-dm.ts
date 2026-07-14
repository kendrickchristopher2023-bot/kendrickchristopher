import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, checkUsageOrReturnError, requireAuth, textResult } from "../_helpers";

export default defineTool({
  name: "generate_referral_dm",
  title: "Generate a referral DM",
  description: "Draft a warm, specific LinkedIn DM asking someone at a target company for a 15-min chat.",
  inputSchema: {
    person_name: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    role: z.string().max(200).optional(),
    context: z.string().max(2000).optional().describe("Anything specific about this person (post, background, mutual)."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ person_name, company, role, context }, ctx) => {
    requireAuth(ctx);
    const text = await callGateway(
      `Write a warm, specific LinkedIn DM to ${person_name} at ${company}${role ? ` about the ${role} role` : ""}.
Rules:
- Under 700 characters.
- Open with a specific reason for reaching out to THIS person (not generic praise).
- Ask for a 15-min chat about the team, not a job. No hard referral ask in first message.
- Sign off "— Chris" (or the user's name if provided).
${context ? `\nExtra context: ${context}` : ""}
Return ONLY the DM text.`,
    );
    return textResult(text.trim());
  },
});
