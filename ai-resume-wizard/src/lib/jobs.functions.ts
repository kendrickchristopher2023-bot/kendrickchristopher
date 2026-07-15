// Server functions for the job-discovery feature.
// - listJobListings: paged browse of the shared pool
// - listWatchedCompanies / addWatchedCompany / removeWatchedCompany
// - saveJobToMatches: one-click "save this listing to my personal matches"
// - refreshWatchedNow: manual on-demand fetch (same logic as the cron)
// - autoRankForCurrentUser: manual on-demand run of the weekly ranker

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

export type JobListing = {
  id: string;
  source: string;
  source_id: string;
  company: string;
  role: string;
  location: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  url: string;
  description: string | null;
  remote: boolean;
  posted_at: string | null;
  fetched_at: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  experience_level: string | null;
};

export type WatchedCompany = {
  id: string;
  source: string;
  slug: string;
  company_name: string;
  added_by: string;
  last_fetched_at: string | null;
  last_fetch_status: string | null;
  last_fetch_count: number | null;
};

const KNOWN_SOURCES = ["greenhouse", "lever", "ashby", "remotive", "remoteok", "jobicy", "arbeitnow", "themuse"] as const;

// Aggregate (non-company-specific) feeds. These rows have source_slug = null
// and are gated per-user by profiles.enabled_feeds (default = all on).
export const AGGREGATE_FEEDS = ["remotive", "remoteok", "jobicy", "arbeitnow", "themuse"] as const;
export type AggregateFeed = (typeof AGGREGATE_FEEDS)[number];

// Escape a user string for safe inclusion in a PostgREST `.or()` filter value.
// PostgREST parses `,` and `)` inside `.or(...)`, so anything user-supplied must
// have them stripped/escaped. We only allow ilike wildcards.
function escapeForOr(v: string): string {
  return v.replace(/[,()*]/g, " ").replace(/\s+/g, " ").trim();
}

// Turn a free-text search into a websearch tsquery — safe for FTS.
function toWebsearch(q: string): string {
  return q.replace(/[\\'"]/g, " ").trim();
}

const EXPERIENCE_LEVELS = [
  "intern",
  "entry",
  "mid",
  "senior",
  "lead",
  "manager",
  "director+",
] as const;

// Load the (watched_companies, enabled_feeds) that define this user's
// personal Discover pool. Callers pass the tuples into
// `applyUserPoolFilter` to scope any job_listings query.
export async function loadUserPoolScope(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
): Promise<{ watched: Array<{ source: string; slug: string }>; enabledFeeds: AggregateFeed[] }> {
  const [w, p] = await Promise.all([
    supabase
      .from("watched_companies")
      .select("source, slug")
      .eq("added_by", userId),
    supabase
      .from("profiles")
      .select("enabled_feeds")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  const watched = ((w.data ?? []) as Array<{ source: string; slug: string }>).slice(0, 500);
  const raw = (p.data?.enabled_feeds as string[] | null) ?? null;
  const enabledFeeds: AggregateFeed[] = raw
    ? (raw.filter((s) => (AGGREGATE_FEEDS as readonly string[]).includes(s)) as AggregateFeed[])
    : [...AGGREGATE_FEEDS]; // default: all on
  return { watched, enabledFeeds };
}

// Build the PostgREST `.or(...)` clause that restricts job_listings to the
// user's visible pool. Returns null when the scope is empty (caller should
// short-circuit and return zero rows with a friendly "add companies" hint).
export function buildUserPoolOrClause(scope: {
  watched: Array<{ source: string; slug: string }>;
  enabledFeeds: AggregateFeed[];
}): string | null {
  const parts: string[] = [];
  // De-dup watched (source, slug) — safety net; unique constraint already prevents this per user.
  const seen = new Set<string>();
  for (const w of scope.watched) {
    const key = `${w.source}:${w.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Slug validator restricts to [a-zA-Z0-9_-], so no escaping is needed.
    parts.push(`and(source.eq.${w.source},source_slug.eq.${w.slug})`);
  }
  for (const f of scope.enabledFeeds) {
    parts.push(`and(source.eq.${f},source_slug.is.null)`);
  }
  if (parts.length === 0) return null;
  return parts.join(",");
}


export const listJobListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        // Legacy combined search (role OR company OR city) — still used by callers
        // that pass a single box; new UI uses the split fields below.
        q: z.string().max(200).optional(),
        role: z.string().max(200).optional(),
        company: z.string().max(200).optional(),
        city: z.string().max(120).optional(),
        region: z.string().max(60).optional(),
        country: z.string().max(60).optional(),
        zip: z.string().max(10).optional(),
        radius_miles: z.number().int().min(0).max(500).optional(),
        remoteOnly: z.boolean().optional(),
        source: z.enum(KNOWN_SOURCES).optional(),
        // Salary filter: annualized USD. Rows with unknown salary are INCLUDED
        // by default; set salary_only_listed=true to opt in to the narrow view.
        salary_min: z.number().int().min(0).max(10_000_000).optional(),
        salary_only_listed: z.boolean().optional(),
        // Experience filter: rows without a classified level are INCLUDED by
        // default. Set level_only_classified=true to require a match.
        experience_level: z.enum(EXPERIENCE_LEVELS).optional(),
        level_only_classified: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).max(50_000).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ rows: JobListing[]; total: number }> => {
    let q = context.supabase
      .from("job_listings")
      .select("*", { count: "exact" })
      .order("posted_at", { ascending: false, nullsFirst: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 50) - 1);

    if (data.remoteOnly) q = q.eq("remote", true);
    if (data.source) q = q.eq("source", data.source);

    // Full-text search on role+company. Prefer the split role/company fields;
    // fall back to the legacy combined `q`.
    if (data.role && data.role.trim()) {
      q = q.textSearch("search_vector", toWebsearch(data.role), { type: "websearch", config: "english" });
    }
    if (data.company && data.company.trim()) {
      const like = `%${escapeForOr(data.company)}%`;
      q = q.ilike("company", like);
    }
    if (!data.role && !data.company && data.q && data.q.trim()) {
      q = q.textSearch("search_vector", toWebsearch(data.q), { type: "websearch", config: "english" });
    }

    // Structured location. Zip radius resolves offline to a set of (city, region)
    // pairs; when present it overrides city/region so results stay coherent.
    //
    // Remote-overrides-location: a remote job matches any location by definition,
    // AND ~30% of remote rows in the pool have NULL city (adapters don't always
    // set it). If the user checked "Remote only", skip the city/region/country/
    // zip .or() filters entirely so the count matches what remote=true returns.
    // The UI shows a hint that location filters are ignored in remote-only mode.
    if (data.remoteOnly) {
      // no location predicate — every remote row qualifies regardless of city
    } else if (data.zip && (data.radius_miles ?? 0) > 0) {
      const { nearbyZips, lookupZip } = await import("./zipcodes.server");
      const zips = nearbyZips(data.zip, data.radius_miles!).slice(0, 500);
      const cities = new Set<string>();
      let inferredRegion: string | null = null;
      for (const z of zips) {
        const info = lookupZip(z);
        if (info?.city) cities.add(info.city.toLowerCase());
        if (!inferredRegion && info?.state) inferredRegion = info.state;
      }
      if (cities.size > 0) {
        // ilike-based OR against the free-text location field too, since older
        // rows haven't been re-ingested yet and may not have city populated.
        const cityList = Array.from(cities).slice(0, 200);
        const orParts = cityList.flatMap((c) => [
          `city.ilike.${c}`,
          `location.ilike.%${escapeForOr(c)}%`,
        ]);
        q = q.or(orParts.join(","));
      }
      if (inferredRegion) q = q.or(`region.ilike.${inferredRegion},location.ilike."%, ${inferredRegion}%"`);
    } else {
      if (data.city && data.city.trim()) {
        const c = escapeForOr(data.city);
        q = q.or(`city.ilike.${c},location.ilike.%${c}%`);
      }
      if (data.region && data.region.trim()) {
        const r = escapeForOr(data.region);
        q = q.or(`region.ilike.${r},location.ilike."%, ${r}%"`);
      }
      if (data.country && data.country.trim()) {
        const c = escapeForOr(data.country);
        q = q.or(`country.ilike.${c},location.ilike.%${c}%`);
      }
    }


    // Salary: hide unknowns only when the user explicitly opts in. Salary is
    // stored annualized in native currency, so we compare against USD/null-
    // currency rows to avoid mixing scales (a €150k row won't be matched by
    // a $150k threshold — that's fine, we treat it as "unknown for filter").
    if (data.salary_only_listed) {
      q = q.not("salary_max", "is", null);
    }
    if (data.salary_min && data.salary_min > 0) {
      const min = data.salary_min;
      if (data.salary_only_listed) {
        q = q.gte("salary_max", min);
        q = q.or(`salary_currency.eq.USD,salary_currency.is.null`);
      } else {
        // Include rows with unknown salary OR (known salary that meets threshold
        // AND currency compatible with USD comparison).
        q = q.or(
          `salary_max.is.null,and(salary_max.gte.${min},or(salary_currency.eq.USD,salary_currency.is.null))`,
        );
      }
    }

    // Experience: same include-unknown-by-default behavior.
    if (data.experience_level) {
      if (data.level_only_classified) {
        q = q.eq("experience_level", data.experience_level);
      } else {
        q = q.or(
          `experience_level.eq.${data.experience_level},experience_level.is.null`,
        );
      }
    }

    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: (rows ?? []) as JobListing[], total: count ?? (rows?.length ?? 0) };
  });

export const listWatchedCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WatchedCompany[]> => {
    const { data, error } = await context.supabase
      .from("watched_companies")
      .select("*")
      .order("company_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as WatchedCompany[];
  });

export const addWatchedCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        source: z.enum(KNOWN_SOURCES),
        slug: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, "letters/numbers/dash/underscore only"),
        company_name: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<WatchedCompany> => {
    const { data: row, error } = await context.supabase
      .from("watched_companies")
      .insert({
        source: data.source,
        slug: data.slug,
        company_name: data.company_name,
        added_by: context.userId,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return row as WatchedCompany;
  });

export const removeWatchedCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // RLS enforces that only rows the user added can be deleted
    const { error } = await context.supabase.from("watched_companies").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const saveJobToMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ job_listing_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: job, error: jerr } = await context.supabase
      .from("job_listings")
      .select("*")
      .eq("id", data.job_listing_id)
      .maybeSingle();
    if (jerr) throw jerr;
    if (!job) throw new Error("Job listing not found");
    const j = job as JobListing;

    const { data: existing } = await context.supabase
      .from("personal_matches")
      .select("id")
      .eq("user_id", context.userId)
      .eq("job_listing_id", j.id)
      .maybeSingle();
    if (existing) return { id: (existing as { id: string }).id, alreadySaved: true };

    const { data: row, error } = await context.supabase
      .from("personal_matches")
      .insert({
        user_id: context.userId,
        company: j.company,
        role: j.role,
        location: j.location,
        role_url: j.url,
        notes: null,
        job_listing_id: j.id,
        source: "discover",
        status: "saved",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id, alreadySaved: false };
  });

export const updateMatchStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["saved", "interested", "applied", "passed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("personal_matches")
      .update({ status: data.status } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// On-demand refresh (same code path as the daily cron, callable from the UI).
// Runs as the admin — we already require admin for this UI action.

export const refreshWatchedNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin-gate: only admins can trigger a full pool refresh from the UI.
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin" as never)
      .maybeSingle();
    if (!role) throw new Error("Only admins can trigger a global refresh.");

    const { runRefreshJobs } = await import("./jobs.refresh.server");
    return runRefreshJobs();
  });

// One-off backfill: strip HTML tags and decode entities on every existing
// job_listings row. Safe to re-run — idempotent (clean text stays clean).
export const backfillJobDescriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin" as never)
      .maybeSingle();
    if (!role) throw new Error("Admins only.");

    const { stripHtmlInline, stripHtmlToText } = await import("./strip-html");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const PAGE = 500;
    let from = 0;
    let scanned = 0;
    let updated = 0;
    // Loop until we've walked the whole table. Using range() + id ordering
    // for stable pagination.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("job_listings")
        .select("id, role, company, location, description")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      scanned += data.length;

      for (const row of data as Array<{
        id: string;
        role: string;
        company: string;
        location: string | null;
        description: string | null;
      }>) {
        const newRole = stripHtmlInline(row.role) ?? row.role;
        const newCompany = stripHtmlInline(row.company) ?? row.company;
        const newLoc = stripHtmlInline(row.location);
        const newDesc = stripHtmlToText(row.description);
        if (
          newRole !== row.role ||
          newCompany !== row.company ||
          newLoc !== row.location ||
          newDesc !== row.description
        ) {
          const { error: upErr } = await supabaseAdmin
            .from("job_listings")
            .update({
              role: newRole,
              company: newCompany,
              location: newLoc,
              description: newDesc,
            } as never)
            .eq("id", row.id);
          if (upErr) throw upErr;
          updated += 1;
        }
      }

      if (data.length < PAGE) break;
      from += PAGE;
    }
    return { scanned, updated };
  });



// Backfill experience_level and salary_* on existing rows. Idempotent —
// only rewrites when the derived value would change and only fills nulls
// for salary (never overwrites structured feed data).
export const backfillJobClassifiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin" as never)
      .maybeSingle();
    if (!role) throw new Error("Admins only.");

    const { classifyLevel, parseSalaryText, toAnnual } = await import("./job-classify");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const PAGE = 500;
    let from = 0;
    let scanned = 0;
    let levelSet = 0;
    let salarySet = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("job_listings")
        .select("id, role, description, experience_level, salary_max")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      scanned += data.length;

      for (const row of data as Array<{
        id: string;
        role: string;
        description: string | null;
        experience_level: string | null;
        salary_max: number | null;
      }>) {
        const patch: Record<string, unknown> = {};
        if (!row.experience_level) {
          const lvl = classifyLevel(row.role);
          if (lvl) {
            patch.experience_level = lvl;
            levelSet += 1;
          }
        }
        if (row.salary_max == null && row.description) {
          const p = parseSalaryText(row.description);
          if (p.max != null && p.period) {
            const a = toAnnual(p.min, p.max, p.period);
            patch.salary_min = a.min;
            patch.salary_max = a.max;
            patch.salary_currency = p.currency ?? "USD";
            patch.salary_period = a.period;
            salarySet += 1;
          }
        }
        if (Object.keys(patch).length > 0) {
          const { error: upErr } = await supabaseAdmin
            .from("job_listings")
            .update(patch as never)
            .eq("id", row.id);
          if (upErr) throw upErr;
        }
      }

      if (data.length < PAGE) break;
      from += PAGE;
    }
    return { scanned, levelSet, salarySet };
  });


export const autoRankForCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { rankJobsForUser } = await import("./jobs.rank.server");
    const { data: resumeRow } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    const resume = resumeRow?.data as unknown as MasterResume | undefined;
    if (!resume) throw new Error("Save a primary resume first.");

    return rankJobsForUser({ supabase: context.supabase, userId: context.userId, resume });
  });
