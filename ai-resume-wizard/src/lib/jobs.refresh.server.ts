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
  const { data: watchedRaw, error } = await supabaseAdmin
    .from("watched_companies")
    .select("id, source, slug, company_name")
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

    await supabaseAdmin
      .from("watched_companies")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_fetch_status: "ok",
        last_fetch_count: jobs.length,
      } as never)
      .in("id", w.ids);
  });
}

export async function runRefreshSlice(slice: RefreshSlice): Promise<SliceSummary> {
  const started = Date.now();
  const summary: SliceSummary = {
    slice,
    jobsUpserted: 0,
    companiesTried: 0,
    companiesOk: 0,
    companiesFailed: 0,
    errors: [],
    ms: 0,
  };
  if (slice === "watched") {
    await runWatchedSlice(summary);
  } else {
    await runAggregatorSlice(slice, summary);
  }
  summary.ms = Date.now() - started;
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
  // types.ts hasn't picked it up yet, so we cast rpc to a loose signature.
  const rpc = supabaseAdmin.rpc as unknown as (
    fn: string,
  ) => Promise<{ error: { message: string } | null }>;
  const { error } = await rpc("dispatch_refresh_slices");
  if (error) throw new Error(`dispatch_refresh_slices failed: ${error.message}`);
  return { dispatched: [...REFRESH_SLICES] };
}
