import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "update_application",
  title: "Update an application",
  description: "Update an existing application's stage, response date, or notes.",
  inputSchema: {
    id: z.string().uuid(),
    stage: z.string().max(50).optional(),
    response_at: z.string().optional().describe("ISO datetime of last response from company."),
    notes: z.string().max(4000).optional(),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ id, stage, response_at, notes }, ctx) => {
    requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (stage) patch.stage = stage;
    if (response_at) patch.response_at = response_at;
    if (notes !== undefined) patch.notes = notes;
    const { data, error } = await supabase
      .from("applications")
      .update(patch as never)
      .eq("id", id)
      .select("id, stage, response_at")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ ok: true, application: data });
  },
});
