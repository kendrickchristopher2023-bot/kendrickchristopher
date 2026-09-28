import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "add_match",
  title: "Add a job match",
  description: "Add a company/role to the signed-in user's private matches list.",
  inputSchema: {
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    role_url: z.string().url().optional(),
    location: z.string().max(200).optional(),
    tier: z.string().max(50).optional().describe("Priority tier, e.g. A/B/C or 1/2/3."),
    notes: z.string().max(2000).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const userId = requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("personal_matches")
      .insert({ user_id: userId, ...input })
      .select("id, company, role")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ ok: true, match: data });
  },
});
