// Per-user AI usage caps + enforcement helper.
//
// One source of truth for daily caps by plan. To tune, edit PLAN_CAPS.
// Every AI-calling server fn / MCP tool calls enforceUsage() to atomically
// increment the counter and reject when the cap is hit.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type UsageAction =
  | "tailor"
  | "cover_letter"
  | "interview_prep"
  | "linkedin"
  | "referral_dm"
  | "parse_resume";

export type Plan = "free" | "pro" | "founder";

export const PLAN_CAPS: Record<Plan, Record<UsageAction, number>> = {
  free: {
    tailor: 10,
    cover_letter: 10,
    interview_prep: 10,
    linkedin: 10,
    referral_dm: 10,
    parse_resume: 5,
  },
  pro: {
    tailor: 200,
    cover_letter: 200,
    interview_prep: 200,
    linkedin: 200,
    referral_dm: 200,
    parse_resume: 50,
  },
  founder: {
    tailor: 200,
    cover_letter: 200,
    interview_prep: 200,
    linkedin: 200,
    referral_dm: 200,
    parse_resume: 50,
  },
};

export const ACTION_LABEL: Record<UsageAction, string> = {
  tailor: "Resume tailoring",
  cover_letter: "Cover letter",
  interview_prep: "Interview prep",
  linkedin: "LinkedIn optimize",
  referral_dm: "Referral DM",
  parse_resume: "Resume parse",
};

export class UsageLimitError extends Error {
  used: number;
  cap: number;
  action: UsageAction;
  constructor(action: UsageAction, used: number, cap: number) {
    super(
      `Daily limit reached for ${ACTION_LABEL[action]} (${used}/${cap}). Resets at midnight UTC.`,
    );
    this.name = "UsageLimitError";
    this.action = action;
    this.used = used;
    this.cap = cap;
  }
}

async function getPlanFor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Plan> {
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  const raw = (data?.plan as string | null) ?? "free";
  if (raw === "pro" || raw === "founder") return raw;
  return "free";
}

/**
 * Atomically check & increment today's usage for `action`.
 * Throws UsageLimitError when the cap is reached.
 */
export async function enforceUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: UsageAction,
): Promise<{ used: number; cap: number; plan: Plan }> {
  const plan = await getPlanFor(supabase, userId);
  const cap = PLAN_CAPS[plan][action];
  const { data, error } = await supabase.rpc("increment_usage", {
    _action: action,
    _cap: cap,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  const used = (row?.used as number) ?? 0;
  const allowed = (row?.allowed as boolean) ?? false;
  if (!allowed) throw new UsageLimitError(action, used, cap);
  return { used, cap, plan };
}
