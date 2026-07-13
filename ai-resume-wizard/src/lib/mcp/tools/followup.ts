import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { callGateway, requireAuth, textResult } from "../_helpers";

export default defineTool({
  name: "draft_followup",
  title: "Draft a follow-up email",
  description: "Draft a follow-up or thank-you email for an application or interview.",
  inputSchema: {
    kind: z.enum(["thank_you", "status_check", "nudge", "post_reject"]).describe("Type of follow-up."),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    recipient_name: z.string().max(200).optional(),
    days_since: z.number().int().min(0).max(365).optional(),
    notes: z.string().max(2000).optional().describe("Anything specific from the last interaction to reference."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async (input, ctx) => {
    requireAuth(ctx);
    const text = await callGateway(
      `Write a ${input.kind} email for the ${input.role} role at ${input.company}.
Recipient: ${input.recipient_name ?? "(unknown, use 'Hi team,')"}
Days since last contact: ${input.days_since ?? "n/a"}
Notes: ${input.notes ?? "(none)"}

Rules:
- Under 150 words.
- Warm, specific, no filler.
- Include a clear single next-step ask.
- Return subject + body:

Subject: ...
Body:
...`,
    );
    return textResult(text.trim());
  },
});
