// Shared plain-text sanitizer for third-party feed content (Greenhouse,
// Lever, Ashby, remote aggregators, etc.). We store PLAIN TEXT — never raw
// HTML — because these feeds are untrusted and rendering their markup with
// dangerouslySetInnerHTML would be an XSS vector.
//
// Steps: strip <script>/<style>/<!--…--> blocks, drop remaining tags, decode
// named + numeric HTML entities, collapse whitespace.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "•",
  middot: "·",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  Eacute: "É",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
  ntilde: "ñ",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    }
    return NAMED_ENTITIES[body] ?? m;
  });
}

export function stripHtmlToText(input: string | null | undefined, max = 4000): string | null {
  if (input == null) return null;
  let s = String(input);
  if (!s) return null;
  s = s
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    // Preserve some vertical structure before dropping tags.
    .replace(/<\/(p|div|li|h[1-6]|tr|br)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  // Collapse whitespace but keep paragraph breaks.
  s = s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}

// For short single-line fields like role/company/location — no newlines.
export function stripHtmlInline(input: string | null | undefined, max = 300): string | null {
  const t = stripHtmlToText(input, max);
  if (t == null) return null;
  const flat = t.replace(/\s+/g, " ").trim();
  return flat || null;
}
