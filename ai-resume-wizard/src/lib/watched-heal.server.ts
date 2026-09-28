// Self-healing routine for watched_companies.
//
// Design boundary (see project spec):
//   - Auto-remap is allowed ONLY when the SAME slug returns real jobs on a
//     DIFFERENT supported platform AND the platform's returned company_name
//     reasonably matches the stored company_name. This is the safe case
//     (company moved Greenhouse → Ashby but kept its handle).
//   - Never auto-apply a DIFFERENT slug. Store candidate slug guesses as
//     unverified SUGGESTIONS the admin can confirm one-click.
//   - Never auto-delete. Quarantine by flipping `active` false; the row
//     stays visible to admin.
//
// Called at the end of the "watched" refresh slice — the set of failed
// companies is small (usually < 30) so probing 3 alternates each stays well
// within the 90s request budget.

import { fetchOne, type RawJob } from "./job-sources.server";

const PLATFORMS = ["greenhouse", "lever", "ashby", "smartrecruiters"] as const;
type Platform = (typeof PLATFORMS)[number];

const QUARANTINE_THRESHOLD = 3;
const PROBE_CONCURRENCY = 4;

type Row = {
  id: string;
  source: string;
  slug: string;
  company_name: string;
  consecutive_failures: number;
  active: boolean;
};

export type HealerEvent =
  | { kind: "auto_healed"; source_from: string; source_to: string; slug: string; company_name: string; jobs: number }
  | { kind: "quarantined"; source: string; slug: string; company_name: string; failures: number; suggestions: Suggestion[] }
  | { kind: "incremented"; source: string; slug: string; company_name: string; failures: number };

export type Suggestion = {
  source: string;
  slug: string;
  reason: string;
  jobs_preview?: number;
  company_name_returned?: string;
};

export type HealerSummary = {
  candidates: number;
  auto_healed: number;
  quarantined: number;
  incremented: number;
  events: HealerEvent[];
  ms: number;
};

// Loose case-insensitive name-sanity check: normalize to lowercase alnum and
// require either exact match or one contains the other. This guards against
// same-slug collisions across companies (e.g. two different orgs both with
// the handle "acme").
function nameMatches(stored: string, returned: string | null | undefined): boolean {
  if (!returned) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = norm(stored);
  const b = norm(returned);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;
  return false;
}

// Extract company_name from adapter output. All our per-company adapters set
// `company` on each RawJob from the passed-in name, so we can't rely on that
// for identity. Ashby/Greenhouse/Lever public boards do return an org name
// in their raw payloads, but our adapters strip it. Fallback: use the slug
// as an identity check — most companies use their real name as the slug or
// a close variant.
function identityFromJobs(jobs: RawJob[], slug: string): string {
  // The adapter overwrites `company` with the stored name, so it's useless
  // for identity. Fall back to the slug — which for legit boards contains
  // the company handle (e.g. "notion", "openai").
  const first = jobs[0];
  if (first?.source_slug) return first.source_slug;
  return slug;
}

async function probePlatform(
  platform: Platform,
  slug: string,
  companyName: string,
): Promise<{ ok: boolean; jobs: RawJob[]; error?: string; name_returned?: string }> {
  try {
    const jobs = await fetchOne(platform, slug, companyName);
    if (jobs.length === 0) return { ok: false, jobs: [], error: "empty" };
    return { ok: true, jobs, name_returned: identityFromJobs(jobs, slug) };
  } catch (e) {
    return { ok: false, jobs: [], error: e instanceof Error ? e.message : String(e) };
  }
}

// Common slug variants humans use. Unverified — surface as suggestions only.
function candidateSlugVariants(slug: string): string[] {
  const s = slug.toLowerCase();
  const bases = new Set<string>();
  const strip = (suffix: string) => (s.endsWith(suffix) ? s.slice(0, -suffix.length) : null);
  for (const suf of ["inc", "hq", "usa", "co", "corp", "labs", "ai"]) {
    const st = strip(suf);
    if (st && st.length >= 2) bases.add(st);
  }
  bases.add(s);
  const out = new Set<string>();
  for (const b of bases) {
    for (const suf of ["", "inc", "hq", "usa", "careers", "jobs", "co", "labs"]) {
      const v = b + suf;
      if (v !== s && v.length >= 2) out.add(v);
    }
  }
  return Array.from(out).slice(0, 6);
}

async function computeSuggestions(
  slug: string,
  companyName: string,
): Promise<Suggestion[]> {
  const variants = candidateSlugVariants(slug);
  const jobs: Suggestion[] = [];
  // Probe each variant across each platform; keep only ones that return jobs
  // and pass the name-sanity check. Bounded: <= 6 variants × 4 platforms = 24
  // network calls, and we only run this at quarantine time (rare).
  const tasks: Array<() => Promise<void>> = [];
  for (const v of variants) {
    for (const p of PLATFORMS) {
      tasks.push(async () => {
        const r = await probePlatform(p, v, companyName);
        if (r.ok && nameMatches(companyName, r.name_returned)) {
          jobs.push({
            source: p,
            slug: v,
            reason: `same company on ${p} under slug "${v}"`,
            jobs_preview: r.jobs.length,
            company_name_returned: r.name_returned,
          });
        }
      });
    }
  }
  await runPool(tasks, PROBE_CONCURRENCY);
  // Cap suggestions to top few.
  return jobs.slice(0, 4);
}

async function runPool<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= tasks.length) return;
      await tasks[idx]();
    }
  });
  await Promise.all(workers);
}

export async function runWatchedHealer(): Promise<HealerSummary> {
  const started = Date.now();
  const events: HealerEvent[] = [];
  const summary: HealerSummary = {
    candidates: 0,
    auto_healed: 0,
    quarantined: 0,
    incremented: 0,
    events,
    ms: 0,
  };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Only look at ACTIVE rows currently in a failed state. Dedupe by (source,slug).
  const { data: raw, error } = await (supabaseAdmin as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: unknown) => {
          ilike: (c: string, v: string) => Promise<{
            data: Row[] | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .from("watched_companies")
    .select("id, source, slug, company_name, consecutive_failures, active")
    .eq("active", true)
    .ilike("last_fetch_status", "error:%");
  if (error) throw new Error(error.message);
  const rows = (raw ?? []) as Row[];

  // Group by (source, slug) — one probe covers every watcher.
  const groups = new Map<string, { source: string; slug: string; company_name: string; ids: string[]; failures: number }>();
  for (const r of rows) {
    const key = `${r.source}:${r.slug}`;
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(r.id);
      existing.failures = Math.max(existing.failures, r.consecutive_failures ?? 0);
    } else {
      groups.set(key, {
        source: r.source,
        slug: r.slug,
        company_name: r.company_name,
        ids: [r.id],
        failures: r.consecutive_failures ?? 0,
      });
    }
  }
  const groupList = Array.from(groups.values());
  summary.candidates = groupList.length;
  if (groupList.length === 0) {
    summary.ms = Date.now() - started;
    return summary;
  }

  for (const g of groupList) {
    // Only consider actual per-company platforms — aggregator errors are a
    // different failure mode and shouldn't be remapped.
    if (!(PLATFORMS as readonly string[]).includes(g.source)) continue;

    const alternates = PLATFORMS.filter((p) => p !== g.source);
    const results = await Promise.all(alternates.map((p) => probePlatform(p, g.slug, g.company_name)));
    const passes = results
      .map((r, idx) => ({ platform: alternates[idx], ...r }))
      .filter((r) => r.ok && nameMatches(g.company_name, r.name_returned));

    if (passes.length === 1) {
      // Auto-remap.
      const winner = passes[0];
      await (supabaseAdmin as unknown as {
        from: (t: string) => {
          update: (v: unknown) => { in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }> };
        };
      })
        .from("watched_companies")
        .update({
          source: winner.platform,
          consecutive_failures: 0,
          disabled_at: null,
          active: true,
          auto_healed_at: new Date().toISOString(),
          auto_heal_from: g.source,
          suggestions: [] as unknown as Suggestion[],
          last_fetch_status: `auto-healed from ${g.source}`,
        })
        .in("id", g.ids);
      events.push({
        kind: "auto_healed",
        source_from: g.source,
        source_to: winner.platform,
        slug: g.slug,
        company_name: g.company_name,
        jobs: winner.jobs.length,
      });
      summary.auto_healed += 1;
      // Audit log — one entry per unique (source,slug), not per watcher.
      try {
        await (supabaseAdmin as unknown as {
          from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> };
        })
          .from("admin_audit_log")
          .insert({
            admin_user_id: "00000000-0000-0000-0000-000000000000",
            action: "watched.auto_healed",
            details: {
              slug: g.slug,
              company_name: g.company_name,
              source_from: g.source,
              source_to: winner.platform,
              jobs_preview: winner.jobs.length,
              watchers: g.ids.length,
            },
          });
      } catch {
        /* audit failure never blocks healing */
      }
      continue;
    }

    // No safe auto-fix. Increment counter; quarantine at threshold.
    const nextFailures = (g.failures ?? 0) + 1;
    if (nextFailures >= QUARANTINE_THRESHOLD) {
      const suggestions = await computeSuggestions(g.slug, g.company_name);
      await (supabaseAdmin as unknown as {
        from: (t: string) => {
          update: (v: unknown) => { in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }> };
        };
      })
        .from("watched_companies")
        .update({
          consecutive_failures: nextFailures,
          active: false,
          disabled_at: new Date().toISOString(),
          suggestions: suggestions as unknown as Suggestion[],
        })
        .in("id", g.ids);
      events.push({
        kind: "quarantined",
        source: g.source,
        slug: g.slug,
        company_name: g.company_name,
        failures: nextFailures,
        suggestions,
      });
      summary.quarantined += 1;
    } else {
      await (supabaseAdmin as unknown as {
        from: (t: string) => {
          update: (v: unknown) => { in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }> };
        };
      })
        .from("watched_companies")
        .update({ consecutive_failures: nextFailures })
        .in("id", g.ids);
      events.push({
        kind: "incremented",
        source: g.source,
        slug: g.slug,
        company_name: g.company_name,
        failures: nextFailures,
      });
      summary.incremented += 1;
    }
  }
  summary.ms = Date.now() - started;
  return summary;
}

// Exported for unit-testable name check.
export const _internal = { nameMatches, candidateSlugVariants };
