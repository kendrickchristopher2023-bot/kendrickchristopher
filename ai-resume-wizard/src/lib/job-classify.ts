// Deterministic classifiers for job-listing metadata.
// - classifyLevel: infer intern/entry/mid/senior/lead/manager/director+ from a
//   role title (plus an optional feed-provided hint like Jobicy's jobLevel).
//   Returns null for anything unclear — we prefer NULL to a made-up "mid".
// - parseSalaryText: best-effort parser for free-text salary strings that some
//   feeds return (Remotive, description bodies). Handles $80k, $80,000,
//   ranges with "-" or "–", currencies $/€/£, and hourly markers.
// - normalizeAnnual: convert a native-period pay figure to an annualized number
//   so filtering treats "$60/hr" and "$125k/yr" on the same scale.

export type ExperienceLevel =
  | "intern"
  | "entry"
  | "mid"
  | "senior"
  | "lead"
  | "manager"
  | "director+";

export const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "intern",
  "entry",
  "mid",
  "senior",
  "lead",
  "manager",
  "director+",
];

// Normalize a free-text hint from a feed (e.g. Jobicy's "Senior",
// "Entry-Level, Junior", "Mid Level") to our taxonomy. Returns null when
// unclear so callers can fall back to the title-based rules.
function normalizeHint(hint: string | null | undefined): ExperienceLevel | null {
  if (!hint) return null;
  const s = hint.toLowerCase();
  if (/\bintern\b/.test(s)) return "intern";
  if (/\b(director|vp|vice president|chief|c-level)\b/.test(s)) return "director+";
  if (/\bmanager\b/.test(s)) return "manager";
  if (/\b(lead|principal|staff)\b/.test(s)) return "lead";
  if (/\bsenior\b/.test(s)) return "senior";
  if (/\b(entry|junior|associate|graduate|new\s*grad|trainee)\b/.test(s)) return "entry";
  if (/\bmid\b/.test(s)) return "mid";
  return null;
}

export function classifyLevel(role: string, hint?: string | null): ExperienceLevel | null {
  const fromHint = normalizeHint(hint);
  if (fromHint) return fromHint;
  const s = ` ${role.toLowerCase()} `;
  if (/\b(intern|internship)\b/.test(s)) return "intern";
  if (/\b(vp|vice president|chief|cto|cfo|ceo|coo|cpo|cmo|head of|director)\b/.test(s)) return "director+";
  if (/\b(manager|mgr)\b/.test(s)) return "manager";
  if (/\b(lead|principal|staff)\b/.test(s)) return "lead";
  if (/\b(sr\.?|senior|snr)\b/.test(s)) return "senior";
  if (/\b(jr\.?|junior|entry|entry-level|associate|graduate|new grad|trainee|apprentice)\b/.test(s)) {
    return "entry";
  }
  // Deliberately no "mid" default — NULL is honest.
  return null;
}

// ---------------------------------------------------------------------------
// Salary

export type ParsedSalary = {
  min: number | null;
  max: number | null;
  currency: string | null; // "USD" | "EUR" | "GBP" | null
  period: string | null;   // "hour" | "day" | "week" | "month" | "year"
};

const PERIOD_MULT: Record<string, number> = {
  hour: 2080,
  day: 260,
  week: 52,
  month: 12,
  year: 1,
};

export function normalizePeriod(p: string | null | undefined): string {
  if (!p) return "year";
  const k = p.toLowerCase();
  if (k.includes("hour") || k === "hr" || k === "hourly") return "hour";
  if (k.includes("day") || k === "daily") return "day";
  if (k.includes("week") || k === "weekly") return "week";
  if (k.includes("month") || k === "monthly") return "month";
  return "year";
}

// Convert a native-period range to annualized numbers. We store annualized
// values in job_listings.salary_min/max so filter comparisons are consistent.
export function toAnnual(
  min: number | null,
  max: number | null,
  period: string | null | undefined,
): { min: number | null; max: number | null; period: string } {
  const p = normalizePeriod(period);
  const mult = PERIOD_MULT[p] ?? 1;
  return {
    min: min != null ? Math.round(min * mult) : null,
    max: max != null ? Math.round(max * mult) : null,
    period: p,
  };
}

// Sanity check: reject numbers that clearly aren't a salary in the intended
// period (e.g. an annualized "$5" or "$50,000,000").
function plausibleAnnual(n: number): boolean {
  return n >= 10_000 && n <= 2_000_000;
}

// Parse the common salary shapes we see in feed text:
//   "$80k - $100k", "$80,000-$100,000", "€76K – €185K",
//   "$60-65/hr", "USD 120000 - 160000".
// Returns nulls when nothing sensible is found.
export function parseSalaryText(text: string | null | undefined): ParsedSalary {
  if (!text) return { min: null, max: null, currency: null, period: null };
  // Only scan the first ~2 KB to keep the regex bounded on huge descriptions.
  const s = String(text).slice(0, 2000).replace(/[\u2013\u2014]/g, "-");

  const currency = /€|EUR\b/i.test(s)
    ? "EUR"
    : /£|GBP\b/i.test(s)
      ? "GBP"
      : /\$|USD\b/i.test(s)
        ? "USD"
        : null;

  const period = /\/\s*(hr|hour)\b|per\s+hour|\bhourly\b/i.test(s)
    ? "hour"
    : /\/\s*(mo|month)\b|per\s+month|\bmonthly\b/i.test(s)
      ? "month"
      : /\/\s*(yr|year)\b|per\s+year|\bannual(?:ly)?\b/i.test(s)
        ? "year"
        : null;

  // Match numbers with optional "k"/"m" suffix. Require a currency-adjacent
  // context so "5 years experience" doesn't get scraped as $5.
  const numRe = /([$€£]|USD|EUR|GBP)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{2,7}(?:\.[0-9]+)?)\s*([kKmM])?/g;
  const nums: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(s))) {
    const hasCurrency = !!m[1];
    let n = parseFloat(m[2].replace(/,/g, ""));
    const suffix = (m[3] ?? "").toLowerCase();
    if (suffix === "k") n *= 1_000;
    else if (suffix === "m") n *= 1_000_000;
    // Require either an explicit currency marker on this token or a "k/m"
    // suffix; otherwise we're guessing.
    if (!hasCurrency && !suffix) continue;
    if (n < 5) continue;
    nums.push(n);
    if (nums.length >= 2) break;
  }
  if (nums.length === 0) return { min: null, max: null, currency, period };
  const a = nums[0];
  const b = nums.length > 1 ? nums[1] : nums[0];
  const min = Math.min(a, b);
  const max = Math.max(a, b);

  // If we didn't see a period marker, guess "year" only when the numbers
  // look annual — otherwise leave as null so callers can decide.
  const inferredPeriod = period ?? (plausibleAnnual(max) ? "year" : null);
  return { min, max, currency, period: inferredPeriod };
}
