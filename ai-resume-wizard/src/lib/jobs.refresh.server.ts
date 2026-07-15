// Shared refresh logic: iterate watched_companies, hit each ATS API,
// upsert normalized rows into public.job_listings.
// Called from both the daily pg_cron webhook and the admin "Refresh now" button.

import { fetchAllAggregators, fetchOne, type RawJob } from "./job-sources.server";

type Summary = {
  companiesTried: number;
  companiesOk: number;
  companiesFailed: number;
  jobsUpserted: number;
  perSource: Record<string, { ok: number; failed: number; jobs: number }>;
  errors: Array<{ source: string; slug: string; error: string }>;
};

const CONCURRENCY = 8;

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

export async function runRefreshJobs(): Promise<Summary> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: watchedRaw, error } = await supabaseAdmin
    .from("watched_companies")
    .select("id, source, slug, company_name")
    // Aggregators handled below — skip any watched rows for them so we don't
    // double-fetch or require a bogus slug.
    .not("source", "in", "(remotive,remoteok,jobicy,arbeitnow,themuse)");
  if (error) throw error;

  // Deduplicate (source, slug) across users: if two users both watch Stripe,
  // fetch it once and let both benefit from the shared cache. `id` and
  // `company_name` come from an arbitrary "winner" row — the ATS API is the
  // source of truth for the company name, so this is safe.
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
    if (existing) {
      existing.ids.push(w.id);
    } else {
      dedupMap.set(key, {
        ids: [w.id],
        source: w.source,
        slug: w.slug,
        company_name: w.company_name,
      });
    }
  }
  const watched = Array.from(dedupMap.values());

  const summary: Summary = {
    companiesTried: 0,
    companiesOk: 0,
    companiesFailed: 0,
    jobsUpserted: 0,
    perSource: {},
    errors: [],
  };
  const bump = (src: string, patch: Partial<{ ok: number; failed: number; jobs: number }>) => {
    const s = summary.perSource[src] ?? { ok: 0, failed: 0, jobs: 0 };
    s.ok += patch.ok ?? 0;
    s.failed += patch.failed ?? 0;
    s.jobs += patch.jobs ?? 0;
    summary.perSource[src] = s;
  };

  // ---- Aggregators (already parallel via Promise.all in fetchAllAggregators) ----
  const aggResults = await fetchAllAggregators();
  await Promise.all(
    aggResults.map(async (r) => {
      summary.companiesTried += 1;
      if (r.error) {
        summary.companiesFailed += 1;
        bump(r.source, { failed: 1 });
        summary.errors.push({ source: r.source, slug: "*", error: r.error });
        return;
      }
      if (r.jobs.length > 0) {
        const { inserted, error: upErr } = await upsertChunks(r.jobs);
        summary.jobsUpserted += inserted;
        bump(r.source, { jobs: inserted });
        if (upErr) summary.errors.push({ source: r.source, slug: "*", error: `upsert: ${upErr}` });
      }
      summary.companiesOk += 1;
      bump(r.source, { ok: 1 });
    }),
  );

  // ---- Per-company (parallel with concurrency cap), one fetch per unique
  // (source, slug); result is mirrored to every user's watched row so per-row
  // last_fetched_at/status stay accurate.
  summary.companiesTried += watched.length;


  await runWithConcurrency(watched, CONCURRENCY, async (w) => {
    let jobs: RawJob[] = [];
    try {
      jobs = await fetchOne(w.source, w.slug, w.company_name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.companiesFailed += 1;
      bump(w.source, { failed: 1 });
      summary.errors.push({ source: w.source, slug: w.slug, error: msg });
      // Mirror the error status onto every user's row for this (source, slug).
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
    bump(w.source, { ok: 1, jobs: inserted });

    // Mirror the successful status onto every user's row for this (source, slug).
    await supabaseAdmin
      .from("watched_companies")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_fetch_status: "ok",
        last_fetch_count: jobs.length,
      } as never)
      .in("id", w.ids);
  });


  return summary;
}
