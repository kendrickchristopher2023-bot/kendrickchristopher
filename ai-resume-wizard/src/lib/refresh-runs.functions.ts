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

    // Surface dead watched slugs (404s etc.) so admin can fix/remove them.
    // Dedupe by (source, slug) — one row per unique upstream, showing how many users watch it.
    // Pull ALL healer-touched rows (active OR quarantined, plus auto-healed).
    const { data: watchedRaw } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          order: (c: string, o: { ascending: boolean }) => Promise<{
            data: Array<{
              id: string;
              source: string;
              slug: string;
              company_name: string;
              last_fetch_status: string | null;
              last_fetched_at: string | null;
              active: boolean;
              consecutive_failures: number;
              disabled_at: string | null;
              auto_healed_at: string | null;
              auto_heal_from: string | null;
              suggestions: unknown;
            }> | null;
          }>;
        };
      };
    })
      .from("watched_companies")
      .select(
        "id, source, slug, company_name, last_fetch_status, last_fetched_at, active, consecutive_failures, disabled_at, auto_healed_at, auto_heal_from, suggestions",
      )
      .order("last_fetched_at", { ascending: false });

    type Suggestion = {
      source: string;
      slug: string;
      reason: string;
      jobs_preview?: number;
      company_name_returned?: string;
    };
    type BadSlug = {
      source: string;
      slug: string;
      company_name: string;
      last_fetch_status: string | null;
      last_fetched_at: string | null;
      watcher_count: number;
      consecutive_failures: number;
    };
    type Quarantined = BadSlug & {
      disabled_at: string | null;
      suggestions: Suggestion[];
      ids: string[];
    };
    type AutoHealed = {
      source: string;
      slug: string;
      company_name: string;
      auto_healed_at: string | null;
      auto_heal_from: string | null;
      watcher_count: number;
    };

    const bySlug = new Map<string, BadSlug>();
    const quarantinedMap = new Map<string, Quarantined>();
    const healedMap = new Map<string, AutoHealed>();
    // Auto-healed within last 30 days.
    const HEALED_CUTOFF = Date.now() - 30 * 24 * 3600 * 1000;
    for (const w of watchedRaw ?? []) {
      const key = `${w.source}:${w.slug}`;
      // Active + failing (not yet quarantined) — the classic "bad slug" list.
      if (w.active && (w.last_fetch_status ?? "").startsWith("error:")) {
        const existing = bySlug.get(key);
        if (existing) existing.watcher_count += 1;
        else
          bySlug.set(key, {
            source: w.source,
            slug: w.slug,
            company_name: w.company_name,
            last_fetch_status: w.last_fetch_status,
            last_fetched_at: w.last_fetched_at,
            watcher_count: 1,
            consecutive_failures: w.consecutive_failures ?? 0,
          });
      }
      // Quarantined — needs attention, may have suggestions.
      if (!w.active) {
        const existing = quarantinedMap.get(key);
        if (existing) {
          existing.watcher_count += 1;
          existing.ids.push(w.id);
        } else {
          quarantinedMap.set(key, {
            source: w.source,
            slug: w.slug,
            company_name: w.company_name,
            last_fetch_status: w.last_fetch_status,
            last_fetched_at: w.last_fetched_at,
            watcher_count: 1,
            consecutive_failures: w.consecutive_failures ?? 0,
            disabled_at: w.disabled_at,
            suggestions: Array.isArray(w.suggestions) ? (w.suggestions as Suggestion[]) : [],
            ids: [w.id],
          });
        }
      }
      // Recently auto-healed — informational.
      if (w.auto_healed_at && new Date(w.auto_healed_at).getTime() >= HEALED_CUTOFF) {
        const existing = healedMap.get(key);
        if (existing) existing.watcher_count += 1;
        else
          healedMap.set(key, {
            source: w.source,
            slug: w.slug,
            company_name: w.company_name,
            auto_healed_at: w.auto_healed_at,
            auto_heal_from: w.auto_heal_from,
            watcher_count: 1,
          });
      }
    }

    return {
      latestBySlice: Array.from(bySlice.values()).sort((a, b) => a.slice.localeCompare(b.slice)),
      recent: rows.slice(0, 50),
      badSlugs: Array.from(bySlug.values()),
      quarantined: Array.from(quarantinedMap.values()),
      autoHealed: Array.from(healedMap.values()).sort(
        (a, b) => new Date(b.auto_healed_at ?? 0).getTime() - new Date(a.auto_healed_at ?? 0).getTime(),
      ),
    };
  });


