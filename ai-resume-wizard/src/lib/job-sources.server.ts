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
  // Slug of the watched company that produced this row. Aggregate feeds
  // (remotive/remoteok/jobicy/arbeitnow/themuse) leave this null — they
  // aren't company-specific, so there's no owning slug to attribute.
  source_slug: string | null;
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
      source_slug: slug,
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
      source_slug: slug,
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
// includeCompensation=true returns a `compensation` object per posting with
// structured salary tiers. We take the first Salary component's min/max/
// currency/interval; equity/bonus components are ignored for filter purposes.
export async function fetchAshby(slug: string, companyName: string): Promise<RawJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`;
  const data = (await fetchJson(url)) as {
    jobs?: Array<{
      id: string;
      title: string;
      location?: string;
      jobUrl: string;
      descriptionPlain?: string;
      publishedDate?: string;
      isRemote?: boolean;
      employmentType?: string;
      secondaryLocations?: Array<{ location?: string }>;
      compensation?: {
        summaryComponents?: Array<{
          compensationType?: string;
          interval?: string;
          currencyCode?: string | null;
          minValue?: number | null;
          maxValue?: number | null;
        }>;
      };
    }>;
  };
  return (data.jobs ?? []).map((j) => {
    const loc = j.location ?? null;
    const salaryComp = j.compensation?.summaryComponents?.find(
      (c) => c.compensationType === "Salary" && (c.minValue != null || c.maxValue != null),
    );
    const intervalToPeriod = (i?: string) => {
      if (!i) return null;
      const u = i.toUpperCase();
      if (u.includes("HOUR")) return "hour";
      if (u.includes("MONTH")) return "month";
      if (u.includes("WEEK")) return "week";
      if (u.includes("DAY")) return "day";
      return "year"; // "1 YEAR"
    };
    return withParsed(
      {
        source: "ashby",
        source_id: `${slug}:${j.id}`,
        source_slug: slug,
        company: companyName,
        role: j.title,
        location: loc,
        url: j.jobUrl,
        description: stripHtml(j.descriptionPlain ?? null),
        remote: !!j.isRemote || looksRemote(loc),
        posted_at: j.publishedDate ?? null,
      },

      {
        levelHint: j.employmentType ?? null,
        salary: salaryComp
          ? {
              min: salaryComp.minValue ?? null,
              max: salaryComp.maxValue ?? null,
              currency: salaryComp.currencyCode ?? null,
              period: intervalToPeriod(salaryComp.interval),
            }
          : null,
      },
    );
  });
}

// ---------- Remotive ----------
// https://remotive.com/api/remote-jobs (aggregator — one call, all listings)
// `salary` is a free-text field like "$80k - $100k" — best-effort parse.
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
      salary?: string;
      job_type?: string;
    }>;
  };
  return (data.jobs ?? []).map((j) => {
    const parsedSalary = j.salary ? parseSalaryText(j.salary) : null;
    return withParsed(
      {
        source: "remotive",
        source_id: String(j.id),
        source_slug: null,
        company: j.company_name,
        role: j.title,
        location: j.candidate_required_location ?? "Remote",
        url: j.url,
        description: stripHtml(j.description ?? null),
        remote: true,
        posted_at: j.publication_date ?? null,
      },

      {
        levelHint: j.job_type ?? null,
        salary:
          parsedSalary && parsedSalary.max != null
            ? {
                min: parsedSalary.min,
                max: parsedSalary.max,
                currency: parsedSalary.currency ?? "USD",
                period: parsedSalary.period ?? "year",
              }
            : null,
      },
    );
  });
}

// ---------- RemoteOK ----------
// https://remoteok.com/api  (first item is a legend row; skip it)
// Provides numeric salary_min / salary_max in USD/year but many rows are 0.
export async function fetchRemoteOK(): Promise<RawJob[]> {
  const url = `https://remoteok.com/api`;
  const raw = (await fetchJson(url)) as Array<Record<string, unknown>>;
  const items = (raw ?? []).filter((r) => r && typeof (r as { id?: unknown }).id !== "undefined");
  return items.map((j) => {
    const loc = (j.location as string | undefined) || "Remote";
    const sMin = typeof j.salary_min === "number" ? j.salary_min : null;
    const sMax = typeof j.salary_max === "number" ? j.salary_max : null;
    const hasSalary = (sMin != null && sMin > 0) || (sMax != null && sMax > 0);
    return withParsed(
      {
        source: "remoteok",
        source_id: String(j.id),
        source_slug: null,
        company: (j.company as string) ?? "Unknown",
        role: (j.position as string) ?? (j.title as string) ?? "Role",
        location: loc,
        url: (j.url as string) ?? (j.apply_url as string) ?? "",
        description: stripHtml((j.description as string) ?? null),
        remote: true,
        posted_at: (j.date as string) ?? null,
      },

      {
        salary: hasSalary
          ? { min: sMin, max: sMax, currency: "USD", period: "year" }
          : null,
      },
    );
  }).filter((j) => j.url);
}

// ---------- Jobicy ----------
// https://jobicy.com/api/v2/remote-jobs  (keyless; supports ?geo=usa&count=50)
// Best structured salary of the free feeds: salaryMin/Max/Currency/Period +
// jobLevel ("Senior", "Entry-Level, Junior", etc.).
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
      salaryMin?: number | string | null;
      salaryMax?: number | string | null;
      salaryCurrency?: string | null;
      salaryPeriod?: string | null;
      jobLevel?: string | null;
    }>;
  };
  return (data.jobs ?? []).map((j) => {
    const num = (v: unknown) => {
      const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const sMin = num(j.salaryMin);
    const sMax = num(j.salaryMax);
    return withParsed(
      {
        source: "jobicy",
        source_id: String(j.id),
        source_slug: null,
        company: j.companyName,
        role: j.jobTitle,
        location: j.jobGeo ?? "Remote",
        url: j.url,
        description: stripHtml(j.jobDescription ?? j.jobExcerpt ?? null),
        remote: true,
        posted_at: j.pubDate ?? null,
      },

      {
        levelHint: j.jobLevel ?? null,
        salary:
          sMin != null || sMax != null
            ? {
                min: sMin,
                max: sMax,
                currency: j.salaryCurrency ?? "USD",
                period: j.salaryPeriod ?? "year",
              }
            : null,
      },
    );
  });
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
      source_slug: null,
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
// Each response includes `page_count`; we paginate up to MUSE_MAX_PAGES per metro.
const MUSE_LOCATIONS = [
  "Flexible / Remote",
  // Original set
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
  // Southeast expansion — Greensboro/Winston-Salem were returning zero
  // simply because they were never queried.
  "Greensboro, NC",
  "Winston-Salem, NC",
  "Durham, NC",
  "Charleston, SC",
  "Columbia, SC",
  "Greenville, SC",
  "Savannah, GA",
  "Jacksonville, FL",
  "Orlando, FL",
  "Tampa, FL",
  "Richmond, VA",
  "Virginia Beach, VA",
  "Knoxville, TN",
  "Memphis, TN",
  "Birmingham, AL",
  "Louisville, KY",
  "Huntsville, AL",
];

const MUSE_MAX_PAGES = 10; // hard cap per metro
type MuseJob = {
  id: number;
  name: string;
  company?: { name?: string };
  locations?: Array<{ name?: string }>;
  refs?: { landing_page?: string };
  contents?: string;
  publication_date?: string;
};
type MuseResp = { results?: MuseJob[]; page?: number; page_count?: number };

async function fetchMuseMetro(loc: string): Promise<MuseJob[]> {
  const base = `https://www.themuse.com/api/public/jobs?location=${encodeURIComponent(loc)}`;
  let first: MuseResp;
  try {
    first = (await fetchJson(`${base}&page=0`)) as MuseResp;
  } catch {
    return [];
  }
  const results: MuseJob[] = [...(first.results ?? [])];
  const total = Math.min(first.page_count ?? 1, MUSE_MAX_PAGES);
  if (total <= 1) return results;

  // Fetch remaining pages for this metro in parallel. One bad page shouldn't
  // sink the metro — Promise.allSettled + swallow rejections.
  const rest = await Promise.allSettled(
    Array.from({ length: total - 1 }, (_, i) =>
      fetchJson(`${base}&page=${i + 1}`) as Promise<MuseResp>,
    ),
  );
  for (const r of rest) {
    if (r.status === "fulfilled") results.push(...(r.value.results ?? []));
  }
  return results;
}

export async function fetchTheMuse(): Promise<RawJob[]> {
  // Fetch all metros in parallel — one failing metro can't block the batch.
  const perMetro = await Promise.all(
    MUSE_LOCATIONS.map(async (loc) => ({ loc, jobs: await fetchMuseMetro(loc) })),
  );
  const out: RawJob[] = [];
  const seen = new Set<string>();
  for (const { loc, jobs } of perMetro) {
    for (const j of jobs) {
      const key = `muse:${j.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const locName = j.locations?.map((l) => l.name).filter(Boolean).join(", ") || loc;
      out.push(withParsed({
        source: "themuse",
        source_id: String(j.id),
        source_slug: null,
        company: j.company?.name ?? "Unknown",
        role: j.name,
        location: locName,
        url: j.refs?.landing_page ?? "",
        description: stripHtml(j.contents ?? null),
        remote: looksRemote(locName),
        posted_at: j.publication_date ?? null,
      }));
    }
  }
  return out.filter((j) => j.url);
}

// ---------- SmartRecruiters ----------
// https://api.smartrecruiters.com/v1/companies/{company}/postings
// Verified: no keyless cross-company/location search endpoint exists — the
// /v1/postings root returns 404 without a company identifier. So this is a
// PER-COMPANY source (alongside greenhouse/lever/ashby), not an aggregator.
// The list response omits URL + description; we build a deterministic public
// posting URL (jobs.smartrecruiters.com/{company}/{id}) which redirects to
// the canonical slugged URL. Skipping per-posting detail fetches keeps the
// N+1 cost off the refresh path — description stays null, same as some
// aggregator rows already do.
export async function fetchSmartRecruiters(slug: string, companyName: string): Promise<RawJob[]> {
  const out: RawJob[] = [];
  const PAGE_LIMIT = 100;
  const MAX_PAGES = 10; // hard cap → max 1000 postings per company
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=${PAGE_LIMIT}&offset=${page * PAGE_LIMIT}`;
    const data = (await fetchJson(url)) as {
      totalFound?: number;
      content?: Array<{
        id: string;
        name: string;
        releasedDate?: string;
        location?: {
          city?: string;
          region?: string;
          country?: string;
          remote?: boolean;
          fullLocation?: string;
        };
        experienceLevel?: { label?: string };
        typeOfEmployment?: { label?: string };
      }>;
    };
    const items = data.content ?? [];
    for (const j of items) {
      const composed =
        j.location?.fullLocation ??
        [j.location?.city, j.location?.region, j.location?.country?.toUpperCase()]
          .filter(Boolean)
          .join(", ");
      const loc = composed && composed.length > 0 ? composed : null;

      out.push(
        withParsed(
          {
            source: "smartrecruiters",
            source_id: `${slug}:${j.id}`,
            source_slug: slug,
            company: companyName,
            role: j.name,
            location: loc,
            // Deterministic public URL — SmartRecruiters redirects the un-slugged
            // form to the canonical posting page.
            url: `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}/${encodeURIComponent(j.id)}`,
            description: null,
            remote: !!j.location?.remote || looksRemote(loc),
            posted_at: j.releasedDate ?? null,
          },
          {
            levelHint: j.experienceLevel?.label ?? j.typeOfEmployment?.label ?? null,
          },
        ),
      );
    }
    if (items.length < PAGE_LIMIT) break;
  }
  return out;
}

// ---------- USAJOBS ----------
// https://developer.usajobs.gov/api-reference/get-api-search
// Requires an Authorization-Key (per-account) and a User-Agent set to the
// registered email. Queried once per Southeastern metro to fill the huge
// coverage gap for NC/SC/GA/TN/VA/FL. Structured salary lives in
// PositionRemuneration[] with RateIntervalCode ("Per Year", "Per Hour", ...).
const USAJOBS_UA = "kendrickchristopher@hotmail.com"; // registered USAJOBS account email — required header, not a secret
// Metro key (URL-safe, used in ?slice=usajobs:<key>) → USAJOBS LocationName.
// USAJOBS wants FULL state names in LocationName ("Charlotte, North Carolina").
export const USAJOBS_METROS: Record<string, string> = {
  charlotte: "Charlotte, North Carolina",
  raleigh: "Raleigh, North Carolina",
  durham: "Durham, North Carolina",
  greensboro: "Greensboro, North Carolina",
  "winston-salem": "Winston-Salem, North Carolina",
  atlanta: "Atlanta, Georgia",
  savannah: "Savannah, Georgia",
  "charleston-sc": "Charleston, South Carolina",
  "columbia-sc": "Columbia, South Carolina",
  "greenville-sc": "Greenville, South Carolina",
  jacksonville: "Jacksonville, Florida",
  orlando: "Orlando, Florida",
  tampa: "Tampa, Florida",
  miami: "Miami, Florida",
  richmond: "Richmond, Virginia",
  "virginia-beach": "Virginia Beach, Virginia",
  knoxville: "Knoxville, Tennessee",
  nashville: "Nashville, Tennessee",
  memphis: "Memphis, Tennessee",
  birmingham: "Birmingham, Alabama",
  huntsville: "Huntsville, Alabama",
  louisville: "Louisville, Kentucky",
};
const USAJOBS_LOCATIONS = Object.values(USAJOBS_METROS);
const USAJOBS_MAX_PAGES = 5; // hard cap per metro (ResultsPerPage=500 → up to 2500 per metro)

type UsaJobsItem = {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: {
    PositionID?: string;
    PositionTitle?: string;
    PositionURI?: string;
    PositionLocation?: Array<{ LocationName?: string; CityName?: string; CountrySubDivisionCode?: string; CountryCode?: string }>;
    OrganizationName?: string;
    DepartmentName?: string;
    PublicationStartDate?: string;
    PositionRemuneration?: Array<{
      MinimumRange?: string | number;
      MaximumRange?: string | number;
      RateIntervalCode?: string;
      Description?: string;
    }>;
    UserArea?: { Details?: { JobSummary?: string } };
    QualificationSummary?: string;
    JobGrade?: Array<{ Code?: string }>;
  };
};
type UsaJobsResp = {
  SearchResult?: {
    SearchResultCount?: number;
    SearchResultCountAll?: number;
    SearchResultItems?: UsaJobsItem[];
  };
};

function usaJobsInterval(code: string | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toLowerCase();
  if (c.includes("year") || c === "pa") return "year";
  if (c.includes("hour") || c === "ph") return "hour";
  if (c.includes("month") || c === "pm") return "month";
  if (c.includes("week") || c === "pw" || c === "bw") return "week";
  if (c.includes("day") || c === "pd") return "day";
  return null;
}

async function fetchUsaJobsMetro(loc: string, apiKey: string): Promise<UsaJobsItem[]> {
  const items: UsaJobsItem[] = [];
  for (let page = 1; page <= USAJOBS_MAX_PAGES; page++) {
    const url = `https://data.usajobs.gov/api/search?LocationName=${encodeURIComponent(loc)}&ResultsPerPage=500&Page=${page}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let data: UsaJobsResp;
    try {
      const res = await fetch(url, {
        headers: {
          Host: "data.usajobs.gov",
          "User-Agent": USAJOBS_UA,
          "Authorization-Key": apiKey,
          Accept: "application/json",
        },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        // 401 → bad/expired key; log so it's obvious it's the key not the code.
        console.warn(`[usajobs] ${res.status} ${res.statusText} for ${loc} page ${page}`);
        break;
      }
      data = (await res.json()) as UsaJobsResp;
    } catch (e) {
      console.warn(`[usajobs] fetch failed for ${loc} page ${page}:`, e instanceof Error ? e.message : e);
      break;
    } finally {
      clearTimeout(t);
    }
    const batch = data.SearchResult?.SearchResultItems ?? [];
    items.push(...batch);
    if (batch.length < 500) break;
  }
  return items;
}

// Fetch USAJOBS. If `metros` is provided, only those LocationNames are queried;
// otherwise every metro is queried in parallel. Sub-slicing per metro is how
// the dispatch keeps each request inside the Worker's time budget.
export async function fetchUsaJobs(metros?: string[]): Promise<RawJob[]> {
  const apiKey = process.env.USAJOBS_API_KEY;
  if (!apiKey) {
    console.warn("[usajobs] USAJOBS_API_KEY is not set — skipping (adapter returns []). Add it in Project Settings → Secrets to enable.");
    return [];
  }
  const locations = metros && metros.length > 0 ? metros : USAJOBS_LOCATIONS;
  // Fetch metros in parallel; one failing metro can't block the batch.
  const perMetro = await Promise.all(
    locations.map(async (loc) => {
      try {
        return { loc, items: await fetchUsaJobsMetro(loc, apiKey) };
      } catch (e) {
        console.warn(`[usajobs] metro ${loc} failed:`, e instanceof Error ? e.message : e);
        return { loc, items: [] as UsaJobsItem[] };
      }
    }),
  );
  const out: RawJob[] = [];
  const seen = new Set<string>();
  for (const { loc, items } of perMetro) {
    for (const it of items) {
      const d = it.MatchedObjectDescriptor;
      if (!d) continue;
      const id = it.MatchedObjectId ?? d.PositionID;
      if (!id) continue;
      const key = `usajobs:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const locName =
        (d.PositionLocation ?? []).map((l) => l.LocationName).filter(Boolean).join("; ") || loc;

      const rem = d.PositionRemuneration?.[0];
      const toNum = (v: unknown): number | null => {
        const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const sMin = toNum(rem?.MinimumRange);
      const sMax = toNum(rem?.MaximumRange);
      const period = usaJobsInterval(rem?.RateIntervalCode);

      out.push(
        withParsed(
          {
            source: "usajobs",
            source_id: String(id),
            source_slug: null,
            company: d.OrganizationName ?? d.DepartmentName ?? "U.S. Federal Government",
            role: d.PositionTitle ?? "Role",
            location: locName,
            url: d.PositionURI ?? "",
            description: stripHtml(d.UserArea?.Details?.JobSummary ?? d.QualificationSummary ?? null),
            remote: looksRemote(locName),
            posted_at: d.PublicationStartDate ?? null,
          },
          {
            levelHint: d.JobGrade?.[0]?.Code ?? null,
            salary:
              (sMin != null || sMax != null) && period
                ? { min: sMin, max: sMax, currency: "USD", period }
                : null,
          },
        ),
      );
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
    case "smartrecruiters":
      return fetchSmartRecruiters(slug, companyName);
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
    case "usajobs":
      return fetchUsaJobs();
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

// Aggregators don't require a watched company row — the refresh loop calls
// these in addition to iterating watched_companies. SmartRecruiters is per
// company (verified: no keyless cross-company endpoint), so it's NOT here.
export const AGGREGATOR_SOURCES = ["remotive", "remoteok", "jobicy", "arbeitnow", "themuse", "usajobs"] as const;
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


