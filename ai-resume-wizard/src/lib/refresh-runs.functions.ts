// Admin-only observability: last N refresh runs per slice.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RefreshRun = {
  id: string;
  slice: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean | null;
  jobs_upserted: number;
  companies_ok: number;
  companies_failed: number;
  error: string | null;
  ms: number | null;
};

export const listRefreshRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin check — RLS on refresh_runs also enforces this, but we double up
    // so a non-admin gets a clean 403-shaped error rather than an empty list.
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Get most-recent run per slice + last 200 rows for the tail view.
    const { data: recent, error } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (c: string, o: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: RefreshRun[] | null; error: { message: string } | null }>;
          };
        };
      };
    })
      .from("refresh_runs")
      .select("id,slice,started_at,finished_at,ok,jobs_upserted,companies_ok,companies_failed,error,ms")
      .order("started_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (recent ?? []) as RefreshRun[];

    // Reduce to latest-per-slice for the summary.
    const bySlice = new Map<string, RefreshRun>();
    for (const r of rows) {
      const prev = bySlice.get(r.slice);
      if (!prev || new Date(r.started_at).getTime() > new Date(prev.started_at).getTime()) {
        bySlice.set(r.slice, r);
      }
    }
    return {
      latestBySlice: Array.from(bySlice.values()).sort((a, b) => a.slice.localeCompare(b.slice)),
      recent: rows.slice(0, 50),
    };
  });
