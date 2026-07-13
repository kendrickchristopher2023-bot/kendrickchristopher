import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "get_profile",
  title: "Get my profile",
  description: "Read the signed-in user's profile row (email, full_name, plan, onboarded_at).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const userId = requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, plan, onboarded_at, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) return errorResult(error.message);
    return jsonResult({ profile: data });
  },
});
void z;
