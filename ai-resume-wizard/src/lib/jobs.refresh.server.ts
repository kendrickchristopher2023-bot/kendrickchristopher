// Shared refresh logic: iterate watched_companies, hit each ATS API,
// upsert normalized rows into public.job_listings.
// Called from both the daily pg_cron webhook and the admin "Refresh now" button.

import { fetchAllAggregators, fetchOne, type RawJob } from "./job-sources.server";

type Summary = {
  companiesTried: number;
  companiesOk: number;
  companiesFailed: number;
  jobsUpserted: number;
  errors: Array<{ source: string; slug: string; error: string }>;
};

export async function runRefreshJobs(): Promise<Summary> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: watched, error } = await supabaseAdmin
    .from("watched_companies")
    .select("id, source, slug, company_name")
    // Aggregators handled below — skip any watched rows for them so we don't
    // double-fetch or require a bogus slug.
    .not("source", "in", "(remotive,remoteok,jobicy,arbeitnow,themuse)");
  if (error) throw error;

  const summary: Summary = {
    companiesTried: (watched?.length ?? 0),
    companiesOk: 0,
    companiesFailed: 0,
    jobsUpserted: 0,
    errors: [],
  };

  // ---- Aggregators (no per-company slug needed) ----
  const aggResults = await fetchAllAggregators();
  for (const r of aggResults) {
    summary.companiesTried += 1;
    if (r.error) {
      summary.companiesFailed += 1;
      summary.errors.push({ source: r.source, slug: "*", error: r.error });
      continue;
    }
    if (r.jobs.length > 0) {
      const CHUNK = 200;
      for (let i = 0; i < r.jobs.length; i += CHUNK) {
        const chunk = r.jobs.slice(i, i + CHUNK);
        const { error: upErr } = await supabaseAdmin
          .from("job_listings")
          .upsert(chunk as never, { onConflict: "source,source_id" });
        if (upErr) {
          summary.errors.push({ source: r.source, slug: "*", error: `upsert: ${upErr.message}` });
        } else {
          summary.jobsUpserted += chunk.length;
        }
      }
    }
    summary.companiesOk += 1;
  }

  for (const w of (watched ?? []) as Array<{
    id: string;
    source: string;
    slug: string;
    company_name: string;
  }>) {
    let jobs: RawJob[] = [];
    try {
      jobs = await fetchOne(w.source, w.slug, w.company_name);
    } catch (e) {
      summary.companiesFailed += 1;
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push({ source: w.source, slug: w.slug, error: msg });
      await supabaseAdmin
        .from("watched_companies")
        .update({
          last_fetched_at: new Date().toISOString(),
          last_fetch_status: `error: ${msg.slice(0, 200)}`,
          last_fetch_count: 0,
        } as never)
        .eq("id", w.id);
      continue;
    }

    if (jobs.length > 0) {
      // Upsert in reasonable chunks (Postgres limit ~ a few thousand rows/statement)
      const CHUNK = 200;
      for (let i = 0; i < jobs.length; i += CHUNK) {
        const chunk = jobs.slice(i, i + CHUNK);
        const { error: upErr } = await supabaseAdmin
          .from("job_listings")
          .upsert(chunk as never, { onConflict: "source,source_id" });
        if (upErr) {
          summary.errors.push({ source: w.source, slug: w.slug, error: `upsert: ${upErr.message}` });
        } else {
          summary.jobsUpserted += chunk.length;
        }
      }
    }

    summary.companiesOk += 1;
    await supabaseAdmin
      .from("watched_companies")
      .update({
        last_fetched_at: new Date().toISOString(),
        last_fetch_status: "ok",
        last_fetch_count: jobs.length,
      } as never)
      .eq("id", w.id);
  }

  return summary;
}
