// Per-user AI usage caps + enforcement helper.
//
// One source of truth for caps by plan. To tune, edit PLAN_CAPS.
// Every AI-calling server fn / MCP tool calls enforceUsage() to atomically
// increment the counter and reject when the cap is hit.
//
// WINDOWS:
//   free           -> MONTHLY allowance (calendar month, UTC). Resets on the 1st.
//   pro / founder  -> DAILY cap, kept purely as an abuse guard.
//
// The SQL function public.increment_usage(_action) owns enforcement and derives
// the cap from the EFFECTIVE plan itself. PLAN_CAPS below must stay in sync with
// the CASE tables in that function.
//
// Token-free features (PDF/DOCX export, Application History and re-downloads,
// resume editing, application tracking, saved matches, the ATS check) must NEVER
// call enforceUsage. They cost no AI tokens and stay unlimited on every plan.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type UsageAction =
  | "tailor"
  | "cover_letter"
  | "interview_prep"
  | "linkedin"
  | "referral_dm"
  | "parse_resume"
  | "chat";

export type Plan = "free" | "pro" | "founder";

export const PLAN_CAPS: Record<Plan, Record<UsageAction, number>> = {
  // Monthly allowance.
  free: {
    tailor: 3,
    cover_letter: 2,
    interview_prep: 2,
    linkedin: 2,
    referral_dm: 2,
    parse_resume: 3,
    chat: 15,
  },
  // Daily abuse guard.
  pro: {
    tailor: 200,
    cover_letter: 200,
    interview_prep: 200,
    linkedin: 200,
    referral_dm: 200,
    parse_resume: 50,
    chat: 300,
  },
  founder: {
    tailor: 200,
    cover_letter: 200,
    interview_prep: 200,
    linkedin: 200,
    referral_dm: 200,
    parse_resume: 50,
    chat: 300,
  },
};

export const PLAN_WINDOW: Record<Plan, "month" | "day"> = {
  free: "month",
  pro: "day",
  founder: "day",
};

export const ACTION_LABEL: Record<UsageAction, string> = {
  tailor: "Resume tailoring",
  cover_letter: "Cover letter",
  interview_prep: "Interview prep",
  linkedin: "LinkedIn optimize",
  referral_dm: "Referral DM",
  parse_resume: "Resume parse",
  chat: "Chat assistant",
};

export class UsageLimitError extends Error {
  used: number;
  cap: number;
  action: UsageAction;
  constructor(action: UsageAction, used: number, cap: number, plan: Plan = "free") {
    super(
      plan === "free"
        ? `You have used your free monthly allowance for ${ACTION_LABEL[action]} (${used}/${cap}). It resets on the 1st of next month. Upgrade at /settings for a lot more.`
        : `Daily limit reached for ${ACTION_LABEL[action]} (${used}/${cap}). Resets at midnight UTC.`,
    );
    this.name = "UsageLimitError";
    this.action = action;
    this.used = used;
    this.cap = cap;
  }
}

/**
 * THE single source of truth for the effective plan, mirrored by the SQL
 * function public.effective_plan(uuid). Keep both in step.
 *
 *   founder                                  -> founder (expiry ignored)
 *   pro, no expiry or expiry in the future   -> pro
 *   pro, expiry in the past                  -> free (expired pass)
 *   anything else                            -> free
 */
export function computeEffectivePlan(
  planRaw: string | null | undefined,
  planExpiresAt: string | null | undefined,
): Plan {
  if (planRaw === "founder") return "founder";
  if (planRaw === "pro") {
    if (!planExpiresAt) return "pro";
    return new Date(planExpiresAt).getTime() > Date.now() ? "pro" : "free";
  }
  return "free";
}

export async function getPlanFor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Plan> {
  const { data } = await supabase
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", userId)
    .maybeSingle();
  return computeEffectivePlan(
    data?.plan as string | null,
    (data as { plan_expires_at?: string | null } | null)?.plan_expires_at ?? null,
  );
}

/**
 * Atomically check & increment usage for `action` within the plan's window.
 * Throws UsageLimitError when the cap is reached.
 */
export async function enforceUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: UsageAction,
): Promise<{ used: number; cap: number; plan: Plan }> {
  const plan = await getPlanFor(supabase, userId);
  const cap = PLAN_CAPS[plan][action];
  // Cap and window are derived server-side inside increment_usage from the
  // effective plan; we never pass a cap from the client.
  const { data, error } = await supabase.rpc("increment_usage", {
    _action: action,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  const used = (row?.used as number) ?? 0;
  const serverCap = (row?.cap as number) ?? cap;
  const allowed = (row?.allowed as boolean) ?? false;
  if (!allowed) throw new UsageLimitError(action, used, serverCap, plan);
  return { used, cap: serverCap, plan };
}
