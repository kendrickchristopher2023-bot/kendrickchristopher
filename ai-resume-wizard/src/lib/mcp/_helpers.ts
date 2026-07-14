import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";
import { enforceUsage, UsageLimitError, type UsageAction } from "@/lib/usage";


/**
 * Build a per-user Supabase client from the verified OAuth token so RLS
 * runs as that user. Never use the service-role key here.
 */
export function supabaseAsUser(ctx: ToolContext) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  const token = ctx.getToken();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export function requireAuth(ctx: ToolContext): string {
  if (!ctx.isAuthenticated()) throw new Error("Not authenticated");
  const uid = ctx.getUserId();
  if (!uid) throw new Error("No user id on token");
  return uid;
}

export async function callGateway(prompt: string, system?: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system,
    prompt,
  });
  return text;
}

export function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function jsonResult(obj: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }],
    structuredContent: obj as Record<string, unknown>,
  };
}

export function errorResult(msg: string) {
  return { content: [{ type: "text" as const, text: msg }], isError: true };
}

/**
 * Increment today's usage counter (RLS-scoped to signed-in MCP user) and
 * reject when the plan's daily cap is hit. Call at the top of every AI tool.
 * Returns an errorResult you should immediately return on limit-reached.
 */
export async function checkUsageOrReturnError(
  ctx: ToolContext,
  action: UsageAction,
) {
  const supabase = supabaseAsUser(ctx);
  const userId = requireAuth(ctx);
  try {
    await enforceUsage(supabase, userId, action);
    return null;
  } catch (e) {
    if (e instanceof UsageLimitError) return errorResult(e.message);
    return errorResult(e instanceof Error ? e.message : "Usage check failed");
  }
}
