// Fetch adapters for free, keyless ATS/job APIs.
// Server-only (network + secrets), never imported into client code.
//
// Each adapter returns a normalized RawJob[] which the upsert layer inserts into
// public.job_listings. Adapters must be resilient — one company's failure
// should never block the whole refresh, so callers wrap them in try/catch.

import { parseLocation } from "./location-parse";
import { stripHtmlInline, stripHtmlToText } from "./strip-html";
import { classifyLevel, parseSalaryText, toAnnual, type ExperienceLevel } from "./job-classify";

export type RawJob = {
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
  posted_at: string | null; // ISO
  // Salary is stored annualized in native currency; original period is kept
  // for display. All fields null when the feed provided nothing usable.
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  experience_level: ExperienceLevel | null;
};

// Optional structured hints a specific adapter can pass in. Anything absent
// gets inferred from title/description text.
type Hints = {
  levelHint?: string | null;
  salary?: {
    min: number | null;
    max: number | null;
    currency: string | null;
    period: string | null;
  } | null;
};

type Base = Omit<
  RawJob,
  | "city" | "region" | "country"
  | "salary_min" | "salary_max" | "salary_currency" | "salary_period"
  | "experience_level"
>;

function withParsed(base: Base, hints: Hints = {}): RawJob {
  // Sanitize every string field that could carry raw HTML or entities from a
  // third-party feed. Descriptions get the multi-line stripper; short fields
  // get the inline stripper so a stray tag never lands in the DB.
  const cleaned: Base = {
    ...base,
    role: stripHtmlInline(base.role) ?? base.role,
    company: stripHtmlInline(base.company) ?? base.company,
    location: stripHtmlInline(base.location),
    description: stripHtmlToText(base.description),
  };
  const p = parseLocation(cleaned.location);

  // Salary: prefer the adapter-supplied structured hint. Fall back to parsing
  // the description text so pay-transparency ranges buried in the body still
  // count. We annualize so filters compare apples to apples.
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let salaryCurrency: string | null = null;
  let salaryPeriod: string | null = null;
  if (hints.salary && (hints.salary.min != null || hints.salary.max != null)) {
    const a = toAnnual(hints.salary.min, hints.salary.max, hints.salary.period);
    salaryMin = a.min;
    salaryMax = a.max;
    salaryCurrency = hints.salary.currency;
    salaryPeriod = a.period;
  } else if (cleaned.description) {
    const parsed = parseSalaryText(cleaned.description);
    if (parsed.max != null && parsed.period) {
      const a = toAnnual(parsed.min, parsed.max, parsed.period);
      salaryMin = a.min;
      salaryMax = a.max;
      salaryCurrency = parsed.currency;
      salaryPeriod = a.period;
    }
  }

  const level = classifyLevel(cleaned.role, hints.levelHint ?? null);

  return {
    ...cleaned,
    city: p.city,
    region: p.region,
    country: p.country,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: salaryCurrency,
    salary_period: salaryPeriod,
    experience_level: level,
  };
}

const UA = "AIJobKit/1.0 (+https://excel-ai-resume.lovable.app)";
const FETCH_TIMEOUT_MS = 15_000;

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function stripHtml(s: string | null | undefined, max = 4000): string | null {
  // Delegate to the shared sanitizer. Kept as a thin alias so adapters below
  // read the same. `withParsed()` re-sanitizes at the end as a safety net.
  return stripHtmlToText(s, max);
}

function looksRemote(location: string | null, extra?: string | null): boolean {
  const s = `${location ?? ""} ${extra ?? ""}`.toLowerCase();
  return /\bremote\b|\banywhere\b|\bwork from home\b|\bwfh\b/.test(s);
}

// ---------- Greenhouse ----------
// https://boards.greenhouse.io/{slug} and https://boards-api.greenhouse.io/v1/boards/{slug}/jobs
export async function fetchGreenhouse(slug: string, companyName: string): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`;
  const data = (await fetchJson(url)) as {
    jobs?: Array<{
      id: number;
      title: string;
      location?: { name?: string };
      absolute_url: string;
      content?: string;
      updated_at?: string;
    }>;
  };
  return (data.jobs ?? []).map((j) => {
    const loc = j.location?.name ?? null;
    return withParsed({
      source: "greenhouse",
      source_id: `${slug}:${j.id}`,
      company: companyName,
      role: j.title,
      location: loc,
      url: j.absolute_url,
      description: stripHtml(j.content ?? null),
      remote: looksRemote(loc),
      posted_at: j.updated_at ?? null,
    });
  });
}

// ---------- Lever ----------
// https://api.lever.co/v0/postings/{slug}?mode=json
export async function fetchLever(slug: string, companyName: string): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;
  const data = (await fetchJson(url)) as Array<{
    id: string;
    text: string;
    hostedUrl: string;
    categories?: { location?: string; commitment?: string; team?: string };
    descriptionPlain?: string;
    createdAt?: number;
  }>;
  return (data ?? []).map((j) => {
    const loc = j.categories?.location ?? null;
    return withParsed({
      source: "lever",
      source_id: `${slug}:${j.id}`,
      company: companyName,
      role: j.text,
      location: loc,
      url: j.hostedUrl,
      description: stripHtml(j.descriptionPlain ?? null),
      remote: looksRemote(loc, j.categories?.commitment),
      posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    });
  });
}

// ---------- Ashby ----------
// https://api.ashbyhq.com/posting-api/job-board/{slug}
export async function fetchAshby(slug: string, companyName: string): Promise<RawJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=false`;
  const data = (await fetchJson(url)) as {
    jobs?: Array<{
      id: string;
      title: string;
      location?: string;
      jobUrl: string;
      descriptionPlain?: string;
      publishedDate?: string;
      isRemote?: boolean;
      secondaryLocations?: Array<{ location?: string }>;
    }>;
  };
  return (data.jobs ?? []).map((j) => {
    const loc = j.location ?? null;
    return withParsed({
      source: "ashby",
      source_id: `${slug}:${j.id}`,
      company: companyName,
      role: j.title,
      location: loc,
      url: j.jobUrl,
      description: stripHtml(j.descriptionPlain ?? null),
      remote: !!j.isRemote || looksRemote(loc),
      posted_at: j.publishedDate ?? null,
    });
  });
}

// ---------- Remotive ----------
// https://remotive.com/api/remote-jobs (aggregator — one call, all listings)
export async function fetchRemotive(): Promise<RawJob[]> {
  const url = `https://remotive.com/api/remote-jobs?limit=200`;
  const data = (await fetchJson(url)) as {
    jobs?: Array<{
      id: number;
      title: string;
      company_name: string;
      candidate_required_location?: string;
      url: string;
      description?: string;
      publication_date?: string;
    }>;
  };
  return (data.jobs ?? []).map((j) => withParsed({
    source: "remotive",
    source_id: String(j.id),
    company: j.company_name,
    role: j.title,
    location: j.candidate_required_location ?? "Remote",
    url: j.url,
    description: stripHtml(j.description ?? null),
    remote: true,
    posted_at: j.publication_date ?? null,
  }));
}

// ---------- RemoteOK ----------
// https://remoteok.com/api  (first item is a legend row; skip it)
export async function fetchRemoteOK(): Promise<RawJob[]> {
  const url = `https://remoteok.com/api`;
  const raw = (await fetchJson(url)) as Array<Record<string, unknown>>;
  const items = (raw ?? []).filter((r) => r && typeof (r as { id?: unknown }).id !== "undefined");
  return items.map((j) => {
    const loc = (j.location as string | undefined) || "Remote";
    return withParsed({
      source: "remoteok",
      source_id: String(j.id),
      company: (j.company as string) ?? "Unknown",
      role: (j.position as string) ?? (j.title as string) ?? "Role",
      location: loc,
      url: (j.url as string) ?? (j.apply_url as string) ?? "",
      description: stripHtml((j.description as string) ?? null),
      remote: true,
      posted_at: (j.date as string) ?? null,
    });
  }).filter((j) => j.url);
}

// ---------- Jobicy ----------
// https://jobicy.com/api/v2/remote-jobs  (keyless; supports ?geo=usa&count=50)
export async function fetchJobicy(geo = "usa", count = 100): Promise<RawJob[]> {
  const url = `https://jobicy.com/api/v2/remote-jobs?count=${count}&geo=${encodeURIComponent(geo)}`;
  const data = (await fetchJson(url)) as {
    jobs?: Array<{
      id: number | string;
      jobTitle: string;
      companyName: string;
      jobGeo?: string;
      url: string;
      jobExcerpt?: string;
      jobDescription?: string;
      pubDate?: string;
    }>;
  };
  return (data.jobs ?? []).map((j) => withParsed({
    source: "jobicy",
    source_id: String(j.id),
    company: j.companyName,
    role: j.jobTitle,
    location: j.jobGeo ?? "Remote",
    url: j.url,
    description: stripHtml(j.jobDescription ?? j.jobExcerpt ?? null),
    remote: true,
    posted_at: j.pubDate ?? null,
  }));
}

// ---------- Arbeitnow ----------
// https://www.arbeitnow.com/api/job-board-api  (keyless; mixed remote + on-site)
export async function fetchArbeitnow(): Promise<RawJob[]> {
  const url = `https://www.arbeitnow.com/api/job-board-api`;
  const data = (await fetchJson(url)) as {
    data?: Array<{
      slug: string;
      title: string;
      company_name: string;
      location?: string;
      remote?: boolean;
      url: string;
      description?: string;
      created_at?: number;
      tags?: string[];
    }>;
  };
  return (data.data ?? []).map((j) => {
    const loc = j.location ?? null;
    return withParsed({
      source: "arbeitnow",
      source_id: j.slug,
      company: j.company_name,
      role: j.title,
      location: loc,
      url: j.url,
      description: stripHtml(j.description ?? null),
      remote: !!j.remote || looksRemote(loc, (j.tags ?? []).join(" ")),
      posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
    });
  });
}

// ---------- The Muse ----------
// https://www.themuse.com/api/public/jobs  (keyless; supports ?location=Charlotte,%20NC&page=0)
// Called once per metro so US regions (Charlotte, Atlanta, Raleigh, etc.) get real coverage.
const MUSE_LOCATIONS = [
  "Flexible / Remote",
  "Charlotte, NC",
  "Atlanta, GA",
  "Raleigh, NC",
  "Nashville, TN",
  "Miami, FL",
  "New York, NY",
  "Boston, MA",
  "Washington, DC",
  "Philadelphia, PA",
  "Chicago, IL",
  "Minneapolis, MN",
  "Austin, TX",
  "Dallas, TX",
  "Denver, CO",
  "San Francisco, CA",
  "Los Angeles, CA",
  "Seattle, WA",
  "Portland, OR",
];
export async function fetchTheMuse(): Promise<RawJob[]> {
  const out: RawJob[] = [];
  const seen = new Set<string>();
  for (const loc of MUSE_LOCATIONS) {
    const url = `https://www.themuse.com/api/public/jobs?location=${encodeURIComponent(loc)}&page=0`;
    try {
      const data = (await fetchJson(url)) as {
        results?: Array<{
          id: number;
          name: string;
          company?: { name?: string };
          locations?: Array<{ name?: string }>;
          refs?: { landing_page?: string };
          contents?: string;
          publication_date?: string;
        }>;
      };
      for (const j of data.results ?? []) {
        const key = `muse:${j.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const locName = j.locations?.map((l) => l.name).filter(Boolean).join(", ") || loc;
        out.push(withParsed({
          source: "themuse",
          source_id: String(j.id),
          company: j.company?.name ?? "Unknown",
          role: j.name,
          location: locName,
          url: j.refs?.landing_page ?? "",
          description: stripHtml(j.contents ?? null),
          remote: looksRemote(locName),
          posted_at: j.publication_date ?? null,
        }));
      }
    } catch {
      // One metro failing shouldn't kill the batch.
    }
  }
  return out.filter((j) => j.url);
}

export async function fetchOne(source: string, slug: string, companyName: string): Promise<RawJob[]> {
  switch (source) {
    case "greenhouse":
      return fetchGreenhouse(slug, companyName);
    case "lever":
      return fetchLever(slug, companyName);
    case "ashby":
      return fetchAshby(slug, companyName);
    case "remotive":
      return fetchRemotive();
    case "remoteok":
      return fetchRemoteOK();
    case "jobicy":
      return fetchJobicy();
    case "arbeitnow":
      return fetchArbeitnow();
    case "themuse":
      return fetchTheMuse();
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

// Aggregators don't require a watched company row — the refresh loop calls
// these in addition to iterating watched_companies.
export const AGGREGATOR_SOURCES = ["remotive", "remoteok", "jobicy", "arbeitnow", "themuse"] as const;
export async function fetchAllAggregators(): Promise<Array<{ source: string; jobs: RawJob[]; error?: string }>> {
  const results = await Promise.all(
    AGGREGATOR_SOURCES.map(async (s) => {
      try {
        return { source: s, jobs: await fetchOne(s, "", "") };
      } catch (e) {
        return { source: s, jobs: [] as RawJob[], error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return results;
}

