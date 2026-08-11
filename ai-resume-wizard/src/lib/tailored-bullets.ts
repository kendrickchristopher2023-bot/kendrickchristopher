// Role-aware mapping of tailored bullet overrides back onto resume roles.
//
// Tailored bullets used to be keyed by company alone, so two roles at the same
// employer (e.g. a promotion) both received the first role's bullets. Matching
// now prefers company + title, consumes each override at most once, and falls
// back to position so repeats always stay distinct. Older saved sessions have
// no title, so the company-only path is kept as a last resort.

export type BulletOverride = { company: string; title?: string; bullets: string[] };
export type RoleLike = { company: string; title: string; bullets?: string[] };

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();

/**
 * Returns, for each role in `roles` (by index), the override bullets to use, or
 * null when nothing matched. Never returns the same override twice.
 */
export function matchOverridesToRoles(
  roles: RoleLike[],
  overrides: BulletOverride[],
): (string[] | null)[] {
  const used = new Array(overrides.length).fill(false);
  const out: (string[] | null)[] = new Array(roles.length).fill(null);

  const take = (i: number) => {
    used[i] = true;
    return overrides[i].bullets;
  };

  // Pass 1: exact company + title, in order.
  roles.forEach((role, r) => {
    if (out[r]) return;
    for (let i = 0; i < overrides.length; i++) {
      if (used[i]) continue;
      const o = overrides[i];
      if (o.title === undefined) continue;
      if (norm(o.company) === norm(role.company) && norm(o.title) === norm(role.title)) {
        out[r] = take(i);
        return;
      }
    }
  });

  // Pass 2: positional (same index).
  roles.forEach((role, r) => {
    if (out[r]) return;
    const o = overrides[r];
    if (o && !used[r] && o.bullets?.length) out[r] = take(r);
  });

  // Pass 3: company only, consumed in order (legacy sessions).
  roles.forEach((role, r) => {
    if (out[r]) return;
    for (let i = 0; i < overrides.length; i++) {
      if (used[i]) continue;
      if (norm(overrides[i].company) === norm(role.company)) {
        out[r] = take(i);
        return;
      }
    }
  });

  return out.map((b) => (b && b.length ? b : null));
}
