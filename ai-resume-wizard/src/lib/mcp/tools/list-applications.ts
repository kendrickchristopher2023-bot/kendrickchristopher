import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "list_applications",
  title: "List my job applications",
  description: "List the signed-in user's tracked job applications with stage and dates.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional(),
    stage: z.string().max(50).optional().describe("Filter by stage (e.g. applied, interview, offer)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, stage }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    let q = supabase
      .from("applications")
      .select("id, company, role, stage, source, applied_at, response_at, jd_url, notes, tailor_session_id")
      .order("applied_at", { ascending: false })
      .limit(limit ?? 50);
    if (stage) q = q.eq("stage", stage as never);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult({ applications: data });
  },
});
