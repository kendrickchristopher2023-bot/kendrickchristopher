import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "list_matches",
  title: "List my job matches",
  description: "List the signed-in user's private job matches (companies/roles they are targeting).",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("personal_matches")
      .select("id, company, role, role_url, location, tier, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return errorResult(error.message);
    return jsonResult({ matches: data });
  },
});
