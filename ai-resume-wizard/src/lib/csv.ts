// CSV helpers — RFC 4180 compliant.
// Quotes wrap only when required (comma, quote, newline). Embedded quotes doubled.
// CRLF line endings for maximum spreadsheet compatibility.
//
// Formula-injection guard: cells starting with =, +, -, @, or a control
// character are prefixed with a leading apostrophe so Excel/Sheets/Numbers
// treat them as text instead of executing them as a formula. This has a
// mild cost — a user note that literally starts with "-2024 was rough"
// exports as "'-2024 was rough" — but is standard defense per OWASP.

const FORMULA_LEAD = /^[=+\-@\t\r]/;

export function csvEscape(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  if (FORMULA_LEAD.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(csvEscape).join(",");
  const body = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  return body ? `${head}\r\n${body}\r\n` : `${head}\r\n`;
}

export function sanitizeFilename(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "download";
}
