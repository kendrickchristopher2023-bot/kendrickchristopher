import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "get_resume",
  title: "Get my resume",
  description:
    "Return the signed-in user's primary resume (structured JSON as stored). Use this before tailoring, cover-letter, LinkedIn optimize, or interview-prep tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("resumes")
      .select("id, data, is_primary, updated_at")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult({ resume: data });
  },
});
