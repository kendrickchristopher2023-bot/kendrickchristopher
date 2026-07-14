// Fetch adapters for free, keyless ATS/job APIs.
// Server-only (network + secrets), never imported into client code.
//
// Each adapter returns a normalized RawJob[] which the upsert layer inserts into
// public.job_listings. Adapters must be resilient — one company's failure
// should never block the whole refresh, so callers wrap them in try/catch.

export type RawJob = {
  source: string;
  source_id: string;
  company: string;
  role: string;
  location: string | null;
  url: string;
  description: string | null;
  remote: boolean;
  posted_at: string | null; // ISO
};

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

function stripHtml(s: string | null | undefined, max = 2000): string | null {
  if (!s) return null;
  const text = s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
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
    return {
      source: "greenhouse",
      source_id: `${slug}:${j.id}`,
      company: companyName,
      role: j.title,
      location: loc,
      url: j.absolute_url,
      description: stripHtml(j.content ?? null),
      remote: looksRemote(loc),
      posted_at: j.updated_at ?? null,
    };
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
    return {
      source: "lever",
      source_id: `${slug}:${j.id}`,
      company: companyName,
      role: j.text,
      location: loc,
      url: j.hostedUrl,
      description: stripHtml(j.descriptionPlain ?? null),
      remote: looksRemote(loc, j.categories?.commitment),
      posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    };
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
    return {
      source: "ashby",
      source_id: `${slug}:${j.id}`,
      company: companyName,
      role: j.title,
      location: loc,
      url: j.jobUrl,
      description: stripHtml(j.descriptionPlain ?? null),
      remote: !!j.isRemote || looksRemote(loc),
      posted_at: j.publishedDate ?? null,
    };
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
  return (data.jobs ?? []).map((j) => ({
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
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}
