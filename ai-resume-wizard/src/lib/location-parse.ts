// Best-effort parser: free-text ATS location → { city, region, country }.
// Used both when normalizing feed data (server-only ingest) and for filtering.
// Kept dependency-free so it can be imported anywhere.

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
]);

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
  const s = loc.trim();
  if (!s) return empty;
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
      region: US_STATES.has(region.toUpperCase()) ? region.toUpperCase() : region || null,
      country: asCountry(country) ?? country,
    };
  }
  if (parts.length === 2) {
    const [a, b] = parts;
    if (US_STATES.has(b.toUpperCase())) return { city: a, region: b.toUpperCase(), country: "US" };
    const c = asCountry(b);
    if (c) return { city: a, region: null, country: c };
    return { city: a, region: b, country: null };
  }
  const p = parts[0];
  if (US_STATES.has(p.toUpperCase())) return { city: null, region: p.toUpperCase(), country: "US" };
  const c = asCountry(p);
  if (c) return { city: null, region: null, country: c };
  return { city: p, region: null, country: null };
}
