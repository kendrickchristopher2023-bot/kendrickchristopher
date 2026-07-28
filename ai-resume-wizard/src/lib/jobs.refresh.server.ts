// Shared refresh logic: iterate watched_companies, hit each ATS API,
// upsert normalized rows into public.job_listings.
//
// Architecture: the refresh is split into independent "slices" so each fits
// in one HTTP request budget and one slow source can never block the others.
// The daily pg_cron fires one net.http_post per slice; the manual admin
// trigger and the /api/public/hooks/refresh-jobs no-arg call both fan out
// via the same dispatch_refresh_slices() SQL function. Partial success is
// far better than a 502 that saves nothing.

import { AGGREGATOR_SOURCES, USAJOBS_METROS, fetchOne, fetchUsaJobs, type RawJob } from "./job-sources.server";

type SliceSummary = {
  slice: string;
  jobsUpserted: number;
  companiesTried: number;
  companiesOk: number;
  companiesFailed: number;
  errors: Array<{ source: string; slug: string; error: string }>;
  ms: number;
};

const CONCURRENCY = 8;

// Slice names: every aggregator source name (with usajobs sub-sliced per
// metro so no single request has to cover the whole USAJOBS footprint),
// plus "watched" for per-company sources.
const NON_USAJOBS_AGGREGATORS = AGGREGATOR_SOURCES.filter((s) => s !== "usajobs");
const USAJOBS_SLICES = Object.keys(USAJOBS_METROS).map((k) => `usajobs:${k}`);
export const REFRESH_SLICES = [
  ...NON_USAJOBS_AGGREGATORS,
  ...USAJOBS_SLICES,
  "watched",
] as const;
export type RefreshSlice = string;

export function isRefreshSlice(x: string): boolean {
  if (x === "watched") return true;
  if (x.startsWith("usajobs:")) {
    return Object.prototype.hasOwnProperty.call(USAJOBS_METROS, x.slice("usajobs:".length));
  }
  return (AGGREGATOR_SOURCES as readonly string[]).includes(x);
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

async function upsertChunks(rows: RawJob[]): Promise<{ inserted: number; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin
      .from("job_listings")
      .upsert(chunk as never, { onConflict: "source,source_id" });
    if (error) return { inserted, error: error.message };
    inserted += chunk.length;
  }
  return { inserted };
}

async function runAggregatorSlice(source: string, summary: SliceSummary): Promise<void> {
  summary.companiesTried += 1;
  let jobs: RawJob[] = [];
  try {
    if (source.startsWith("usajobs:")) {
      const metroKey = source.slice("usajobs:".length);
      const loc = USAJOBS_METROS[metroKey];
      if (!loc) throw new Error(`unknown usajobs metro key: ${metroKey}`);
      jobs = await fetchUsaJobs([loc]);
    } else {
      jobs = await fetchOne(source, "", "");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    summary.companiesFailed += 1;
    summary.errors.push({ source, slug: "*", error: msg });
    return;
  }
  if (jobs.length > 0) {
    const { inserted, error: upErr } = await upsertChunks(jobs);
    summary.jobsUpserted += inserted;
    if (upErr) summary.errors.push({ source, slug: "*", error: `upsert: ${upErr}` });
  }
  summary.companiesOk += 1;
}

async function runWatchedSlice(summary: SliceSummary): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Skip quarantined rows (active=false) — the healer disabled them and we
  // stop trying so they don't keep spamming errors.
  const { data: watchedRaw, error } = await supabaseAdmin
    .from("watched_companies")
    .select("id, source, slug, company_name")
    .eq("active" as never, true as never)
    .not("source", "in", `(${AGGREGATOR_SOURCES.join(",")})`);
  if (error) throw error;

  // Dedupe (source, slug) across users — one fetch benefits every watcher.
  const dedupMap = new Map<
    string,
    { ids: string[]; source: string; slug: string; company_name: string }
  >();
  for (const w of (watchedRaw ?? []) as Array<{
    id: string;
    source: string;
    slug: string;
    company_name: string;
  }>) {
    const key = `${w.source}:${w.slug}`;
    const existing = dedupMap.get(key);
    if (existing) existing.ids.push(w.id);
    else dedupMap.set(key, { ids: [w.id], source: w.source, slug: w.slug, company_name: w.company_name });
  }
  const watched = Array.from(dedupMap.values());
  summary.companiesTried += watched.length;

  await runWithConcurrency(watched, CONCURRENCY, async (w) => {
    let jobs: RawJob[] = [];
    try {
      jobs = await fetchOne(w.source, w.slug, w.company_name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.companiesFailed += 1;
      summary.errors.push({ source: w.source, slug: w.slug, error: msg });
      await supabaseAdmin
        .from("watched_companies")
        .update({
          last_fetched_at: new Date().toISOString(),
          last_fetch_status: `error: ${msg.slice(0, 200)}`,
          last_fetch_count: 0,
        } as never)
        .in("id", w.ids);
      return;
    }

    let inserted = 0;
    if (jobs.length > 0) {
      const res = await upsertChunks(jobs);
      inserted = res.inserted;
      if (res.error) summary.errors.push({ source: w.source, slug: w.slug, error: `upsert: ${res.error}` });
    }
    summary.jobsUpserted += inserted;
    summary.companiesOk += 1;

    // Reset consecutive_failures on success — clears the way for the healer
    // to ignore this row next run.
    await supabaseAdmin
      .from("watched_companies")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_fetch_status: "ok",
        last_fetch_count: jobs.length,
        consecutive_failures: 0,
      } as never)
      .in("id", w.ids);
  });

  // Self-healer runs after the fetch loop. Only touches rows currently
  // marked as failed, so the work set is small and bounded.
  try {
    const { runWatchedHealer } = await import("./watched-heal.server");
    const healed = await runWatchedHealer();
    if (healed.candidates > 0) {
      console.log(
        `watched healer: candidates=${healed.candidates} auto_healed=${healed.auto_healed} quarantined=${healed.quarantined} incremented=${healed.incremented} ms=${healed.ms}`,
      );
    }
  } catch (e) {
    // Healer failure must never take down the refresh.
    console.error("watched healer failed:", e instanceof Error ? e.message : String(e));
  }
}

export async function runRefreshSlice(slice: RefreshSlice): Promise<SliceSummary> {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  const summary: SliceSummary = {
    slice,
    jobsUpserted: 0,
    companiesTried: 0,
    companiesOk: 0,
    companiesFailed: 0,
    errors: [],
    ms: 0,
  };

  // Insert a "started" row up front so a mid-run crash still leaves a trail.
  // If the initial insert fails for any reason (silent RLS block, transient
  // net error, cold-start abort), fall back at the end to a single full-row
  // insert so we never lose the record entirely.
  let runId: string | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as unknown as {
      from: (t: string) => { insert: (v: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } } };
    })
      .from("refresh_runs")
      .insert({ slice, started_at: startedAt })
      .select("id")
      .single();
    if (error) console.error(`refresh_runs initial insert failed for slice=${slice}:`, error.message);
    runId = data?.id ?? null;
  } catch (e) {
    // observability failure must never break the actual refresh
    console.error(`refresh_runs initial insert threw for slice=${slice}:`, e instanceof Error ? e.message : String(e));
  }

  let thrown: unknown = null;
  try {
    if (slice === "watched") await runWatchedSlice(summary);
    else await runAggregatorSlice(slice, summary);
  } catch (e) {
    thrown = e;
  } finally {
    summary.ms = Date.now() - started;
    // A slice is only "failed" if it produced NOTHING or threw at the top level.
    // Per-company 404s on the watched slice are a detail, not a wholesale failure —
    // one dead Greenhouse slug shouldn't turn 6k successful upserts red.
    const ok = thrown == null && (summary.jobsUpserted > 0 || summary.companiesFailed === 0);
    const errText = thrown
      ? (thrown instanceof Error ? thrown.message : String(thrown))
      : summary.errors.length > 0
        ? summary.errors.slice(0, 5).map((e) => `${e.source}/${e.slug}: ${e.error}`).join(" | ").slice(0, 2000)
        : null;

    const finishedAt = new Date().toISOString();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (runId) {
        const { error } = await (supabaseAdmin as unknown as {
          from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } };
        })
          .from("refresh_runs")
          .update({
            finished_at: finishedAt,
            ok,
            jobs_upserted: summary.jobsUpserted,
            companies_ok: summary.companiesOk,
            companies_failed: summary.companiesFailed,
            error: errText,
            ms: summary.ms,
          })
          .eq("id", runId);
        if (error) console.error(`refresh_runs update failed for slice=${slice}:`, error.message);
      } else {
        // Fallback: initial insert never landed. Write the full record now so
        // this slice still shows up in observability.
        const { error } = await (supabaseAdmin as unknown as {
          from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> };
        })
          .from("refresh_runs")
          .insert({
            slice,
            started_at: startedAt,
            finished_at: finishedAt,
            ok,
            jobs_upserted: summary.jobsUpserted,
            companies_ok: summary.companiesOk,
            companies_failed: summary.companiesFailed,
            error: errText,
            ms: summary.ms,
          });
        if (error) console.error(`refresh_runs fallback insert failed for slice=${slice}:`, error.message);
      }
    } catch (e) {
      console.error(`refresh_runs write threw for slice=${slice}:`, e instanceof Error ? e.message : String(e));
    }
  }
  if (thrown) throw thrown;
  return summary;
}

// Legacy in-process refresh (kept for scripts/tests). Runs slices sequentially
// in one worker isolate; DO NOT call this from HTTP-timeout-bound paths — use
// dispatchAllRefreshSlices() instead.
export async function runRefreshJobs(): Promise<{ slices: SliceSummary[]; jobsUpserted: number }> {
  const slices: SliceSummary[] = [];
  let jobsUpserted = 0;
  for (const s of REFRESH_SLICES) {
    try {
      const r = await runRefreshSlice(s);
      slices.push(r);
      jobsUpserted += r.jobsUpserted;
    } catch (e) {
      slices.push({
        slice: s,
        jobsUpserted: 0,
        companiesTried: 0,
        companiesOk: 0,
        companiesFailed: 1,
        errors: [{ source: s, slug: "*", error: e instanceof Error ? e.message : String(e) }],
        ms: 0,
      });
    }
  }
  return { slices, jobsUpserted };
}

// Fan out one HTTP request per slice via pg_net. Returns immediately after
// dispatch — each slice request has its own request-timeout budget on the
// Worker, so a slow source cannot 502 the others.
export async function dispatchAllRefreshSlices(): Promise<{ dispatched: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // dispatch_refresh_slices is a new SQL function; the auto-generated
  // types.ts hasn't picked it up yet, so we cast the call to a loose signature.
  // NOTE: must call as a method (supabaseAdmin.rpc(...)), not a detached
  // reference — detaching drops the `this` binding and PostgrestClient
  // fails with "Cannot read properties of undefined (reading 'rest')".
  const { error } = await (
    supabaseAdmin.rpc as unknown as (fn: string) => Promise<{ error: { message: string } | null }>
  ).call(supabaseAdmin, "dispatch_refresh_slices");
  if (error) throw new Error(`dispatch_refresh_slices failed: ${error.message}`);
  return { dispatched: [...REFRESH_SLICES] };
}
