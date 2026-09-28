// Owner metrics feed — read-only, aggregate-only, NO PII.
//
// Every query below is either a HEAD count (no rows returned at all) or a
// select of pure integer counters. No email, name, resume, application or
// token data is ever read here.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type OwnerMetrics = {
  venture: "resume";
  since: string;
  until: string;
  generated_at: string;
  users: { total: number; new_in_window: number; active_in_window: number };
  plans: { free: number; pro: number; founder: number };
  product: {
    resumes_created: number;
    tailor_sessions: number;
    applications_logged: number;
    matches_saved: number;
  };
  ai_usage: {
    tailor: number;
    cover_letter: number;
    interview_prep: number;
    linkedin: number;
    referral_dm: number;
    parse_resume: number;
    chat: number;
  };
};

/** Constant-time string compare (no early exit on mismatch). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Bearer-token gate. The ONLY thing that opens this feed. */
export function authorizeOwnerRequest(request: Request): boolean {
  const expected = process.env["OWNER_METRICS_KEY"];
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return false;
  return safeEqual(header.slice(prefix.length).trim(), expected);
}

export function resolveWindow(
  url: URL,
): { ok: true; since: string; until: string } | { ok: false; error: string } {
  const now = new Date();
  const rawUntil = url.searchParams.get("until");
  const rawSince = url.searchParams.get("since");

  const until = rawUntil ? new Date(rawUntil) : now;
  if (Number.isNaN(until.getTime())) return { ok: false, error: "invalid `until`" };

  const since = rawSince
    ? new Date(rawSince)
    : new Date(until.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(since.getTime())) return { ok: false, error: "invalid `since`" };

  if (since.getTime() >= until.getTime()) {
    return { ok: false, error: "`since` must be earlier than `until`" };
  }
  return { ok: true, since: since.toISOString(), until: until.toISOString() };
}

type Tbl = "profiles" | "resumes" | "tailor_sessions" | "applications" | "personal_matches";

/**
 * Demo/filming accounts (profiles.is_demo) are excluded from every metric so
 * marketing-capture data never lands in owner reporting.
 */
async function demoUserIds(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("profiles").select("id").eq("is_demo", true);
  return (data ?? []).map((r) => r.id);
}

function pgList(ids: string[]): string {
  return `(${ids.join(",")})`;
}

async function countInWindow(
  table: Tbl,
  column: string,
  since: string,
  until: string,
  demoIds: string[],
): Promise<number> {
  let q = supabaseAdmin
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, since)
    .lt(column, until);
  if (demoIds.length) {
    q = q.not(table === "profiles" ? "id" : "user_id", "in", pgList(demoIds));
  }
  const { count } = await q;
  return count ?? 0;
}

async function countPlan(plan: "free" | "pro" | "founder", demoIds: string[]): Promise<number> {
  let q = supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("plan", plan);
  if (demoIds.length) q = q.not("id", "in", pgList(demoIds));
  const { count } = await q;
  return count ?? 0;
}

export async function buildOwnerMetrics(since: string, until: string): Promise<OwnerMetrics> {
  const demoIds = await demoUserIds();
  const [
    totalUsers,
    newUsers,
    activeUsers,
    free,
    pro,
    founder,
    resumes,
    tailor,
    applications,
    matches,
  ] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_demo", false)
      .then((r) => r.count ?? 0),
    countInWindow("profiles", "created_at", since, until, demoIds),
    countInWindow("profiles", "last_active_at", since, until, demoIds),
    countPlan("free", demoIds),
    countPlan("pro", demoIds),
    countPlan("founder", demoIds),
    countInWindow("resumes", "created_at", since, until, demoIds),
    countInWindow("tailor_sessions", "created_at", since, until, demoIds),
    countInWindow("applications", "applied_at", since, until, demoIds),
    countInWindow("personal_matches", "created_at", since, until, demoIds),
  ]);

  // usage_daily is keyed by a `day` date column; sum the integer counters only.
  let usageQuery = supabaseAdmin
    .from("usage_daily")
    .select(
      "tailor_count, cover_letter_count, interview_prep_count, linkedin_count, referral_dm_count, parse_resume_count, chat_count",
    )
    .gte("day", since.slice(0, 10))
    .lte("day", until.slice(0, 10));
  if (demoIds.length) usageQuery = usageQuery.not("user_id", "in", pgList(demoIds));
  const { data: usageRows } = await usageQuery;

  const ai_usage = {
    tailor: 0,
    cover_letter: 0,
    interview_prep: 0,
    linkedin: 0,
    referral_dm: 0,
    parse_resume: 0,
    chat: 0,
  };
  for (const row of usageRows ?? []) {
    ai_usage.tailor += row.tailor_count ?? 0;
    ai_usage.cover_letter += row.cover_letter_count ?? 0;
    ai_usage.interview_prep += row.interview_prep_count ?? 0;
    ai_usage.linkedin += row.linkedin_count ?? 0;
    ai_usage.referral_dm += row.referral_dm_count ?? 0;
    ai_usage.parse_resume += row.parse_resume_count ?? 0;
    ai_usage.chat += row.chat_count ?? 0;
  }

  return {
    venture: "resume",
    since,
    until,
    generated_at: new Date().toISOString(),
    users: { total: totalUsers, new_in_window: newUsers, active_in_window: activeUsers },
    plans: { free, pro, founder },
    product: {
      resumes_created: resumes,
      tailor_sessions: tailor,
      applications_logged: applications,
      matches_saved: matches,
    },
    ai_usage,
  };
}

/** Shared handler used by both the `/api/owner/*` and `/api/public/owner/*` routes. */
export async function handleOwnerMetricsRequest(request: Request): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (!authorizeOwnerRequest(request)) return json({ error: "unauthorized" }, 401);

  const win = resolveWindow(new URL(request.url));
  if (!win.ok) return json({ error: win.error }, 400);

  try {
    return json(await buildOwnerMetrics(win.since, win.until));
  } catch (e) {
    console.error("[owner-metrics]", e);
    return json({ error: "metrics unavailable" }, 500);
  }
}
