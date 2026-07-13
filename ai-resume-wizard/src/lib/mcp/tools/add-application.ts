import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseAsUser } from "../_helpers";

export default defineTool({
  name: "add_application",
  title: "Track a new application",
  description: "Record that the signed-in user applied to a role.",
  inputSchema: {
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    stage: z.string().max(50).optional().describe("Application stage (default: applied)."),
    source: z.string().max(50).optional().describe("Where applied (linkedin, referral, direct, etc.)."),
    jd_url: z.string().url().optional(),
    notes: z.string().max(4000).optional(),
    applied_at: z.string().optional().describe("ISO datetime; defaults to now."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const userId = requireAuth(ctx);
    const supabase = supabaseAsUser(ctx);
    const payload = {
      user_id: userId,
      company: input.company,
      role: input.role,
      stage: (input.stage ?? "applied") as never,
      source: (input.source ?? "direct") as never,
      jd_url: input.jd_url ?? null,
      notes: input.notes ?? null,
      applied_at: input.applied_at ?? new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("applications")
      .insert(payload)
      .select("id, company, role, stage")
      .single();
    if (error) return errorResult(error.message);
    return jsonResult({ ok: true, application: data });
  },
});
