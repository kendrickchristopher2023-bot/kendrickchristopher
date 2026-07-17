// Best-effort parser: free-text ATS location → { city, region, country }.
// Used both when normalizing feed data (server-only ingest) and for filtering.
// Kept dependency-free so it can be imported anywhere.
//
// Multi-location postings (USAJOBS, some Greenhouse boards) come through as
// semicolon-separated lists like "Charlotte, NC; Raleigh, NC". We parse ONLY
// the first segment for the single-value city/region/country columns and rely
// on the full text staying in `location` so ilike fallbacks still hit every
// listed city. See job-listings filtering for that fallback.

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

// Full US state / territory names → 2-letter code. USAJOBS returns the full
// name ("Charlotte, North Carolina"), and every filter in the app matches on
// codes, so we MUST normalize here or federal jobs disappear from state filters.
const US_STATE_NAMES: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
  "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA",
  "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
  "district of columbia": "DC", "washington dc": "DC", "washington d.c.": "DC",
  "puerto rico": "PR", "guam": "GU", "u.s. virgin islands": "VI",
  "virgin islands": "VI", "american samoa": "AS", "northern mariana islands": "MP",
};

function normalizeRegion(v: string): string {
  const trimmed = v.trim();
  const lower = trimmed.toLowerCase();
  if (US_STATE_NAMES[lower]) return US_STATE_NAMES[lower];
  if (US_STATES.has(trimmed.toUpperCase())) return trimmed.toUpperCase();
  return trimmed;
}

function isUsState(v: string): boolean {
  const trimmed = v.trim();
  return (
    US_STATES.has(trimmed.toUpperCase()) ||
    US_STATE_NAMES[trimmed.toLowerCase()] !== undefined
  );
}

const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  "u.s.": "US",
  "u.s.a.": "US",
  usa: "US",
  us: "US",
  "united kingdom": "UK",
  uk: "UK",
  "great britain": "UK",
  england: "UK",
  canada: "CA",
  germany: "DE",
  france: "FR",
  spain: "ES",
  netherlands: "NL",
  ireland: "IE",
  australia: "AU",
  india: "IN",
  singapore: "SG",
  japan: "JP",
  brazil: "BR",
  mexico: "MX",
};

export type ParsedLocation = {
  city: string | null;
  region: string | null;
  country: string | null;
};

export function parseLocation(loc: string | null | undefined): ParsedLocation {
  const empty: ParsedLocation = { city: null, region: null, country: null };
  if (!loc) return empty;
  let s = loc.trim();
  if (!s) return empty;

  // Multi-location postings: only parse the first segment for the single-value
  // columns. The full string stays in `location` for ilike fallback matches.
  if (s.includes(";")) {
    const first = s.split(";")[0]?.trim();
    if (!first) return empty;
    s = first;
  }

  // "Remote", "Anywhere" alone → no structured location
  if (/^(remote|anywhere|worldwide|global|work from home|wfh)\b/i.test(s) && !s.includes(",")) {
    return empty;
  }
  // Strip trailing "(Remote)" etc.
  const cleaned = s.replace(/\((remote|hybrid|on[-\s]?site|onsite)\)/gi, "").trim();
  const parts = cleaned
    .split(/[,/·|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const asCountry = (v: string): string | null => {
    const k = v.toLowerCase();
    if (COUNTRY_ALIASES[k]) return COUNTRY_ALIASES[k];
    if (/^[A-Z]{2}$/.test(v)) return v.toUpperCase();
    return null;
  };

  if (parts.length >= 3) {
    const [city, region, country] = parts;
    return {
      city: city || null,
      region: normalizeRegion(region) || null,
      country: asCountry(country) ?? country,
    };
  }
  if (parts.length === 2) {
    const [a, b] = parts;
    if (isUsState(b)) return { city: a, region: normalizeRegion(b), country: "US" };
    const c = asCountry(b);
    if (c) return { city: a, region: null, country: c };
    return { city: a, region: b, country: null };
  }
  const p = parts[0];
  if (isUsState(p)) return { city: null, region: normalizeRegion(p), country: "US" };
  const c = asCountry(p);
  if (c) return { city: null, region: null, country: c };
  return { city: p, region: null, country: null };
}
