import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "update_resume",
  title: "Update my resume",
  description:
    "Replace the signed-in user's primary resume with the provided JSON. Overwrites existing content — call get_resume first if you want to merge.",
  inputSchema: {
    data: z
      .record(z.string(), z.unknown())
      .describe("Full resume object (summary, experience, education, skills, etc.) to store."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ data }, ctx) => {
    const userId = requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const { data: existing } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("resumes")
        .update({ data: data as never, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return errorResult(error.message);
      return jsonResult({ ok: true, id: existing.id, mode: "updated" });
    }
    const { data: inserted, error } = await supabase
      .from("resumes")
      .insert({ user_id: userId, data: data as never, is_primary: true })
      .select("id")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ ok: true, id: inserted.id, mode: "inserted" });
  },
});
