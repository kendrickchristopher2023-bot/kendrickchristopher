// US-only ZIP → nearby ZIPs lookup using the embedded `zipcodes` dataset.
// Server-only to keep the ~2MB dataset out of the client bundle.
import zipcodes from "zipcodes";

export function nearbyZips(zip: string, radiusMiles: number): string[] {
  const z = (zip || "").trim();
  if (!z) return [];
  try {
    const res = zipcodes.radius(z, Math.max(0, Math.min(500, radiusMiles)));
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export function lookupZip(zip: string) {
  try {
    return zipcodes.lookup((zip || "").trim());
  } catch {
    return undefined;
  }
}
