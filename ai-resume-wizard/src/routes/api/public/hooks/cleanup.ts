// Weekly data-hygiene hook.
// - Deletes job_listings older than 60 days by fetched_at (or posted_at when fetched_at is null),
//   skipping any listing referenced by a personal_matches.job_listing_id (user-saved).
// - Deletes usage_daily rows older than 90 days.
// Reports counts deleted.

import { createFileRoute } from "@tanstack/react-router";

async function runCleanup() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();
  const jobsCutoff = new Date(now - 60 * 86_400_000).toISOString();
  const usageCutoff = new Date(now - 90 * 86_400_000).toISOString().slice(0, 10);

  // Preserve any stale job that is still referenced by:
  //   (a) a personal_matches row (any user has saved it), OR
  //   (b) a watched_companies row on (source, source_slug) — the pool is
  //       personal now, but the cache is shared, so a company still on
  //       ANY user's watchlist should keep its rows even if temporarily stale.
  const { data: refMatches, error: refErr } = await supabaseAdmin
    .from("personal_matches")
    .select("job_listing_id")
    .not("job_listing_id", "is", null);
  if (refErr) throw refErr;
  const referencedByMatches = new Set(
    ((refMatches ?? []) as Array<{ job_listing_id: string | null }>)
      .map((r) => r.job_listing_id)
      .filter((x): x is string => !!x),
  );

  const { data: watched, error: wErr } = await supabaseAdmin
    .from("watched_companies")
    .select("source, slug");
  if (wErr) throw wErr;
  const watchedKeys = new Set(
    ((watched ?? []) as Array<{ source: string; slug: string }>).map(
      (w) => `${w.source}::${w.slug}`,
    ),
  );

  // Walk stale rows in pages; drop any not preserved by either rule above.
  const CHUNK = 200;
  const idsToDelete: string[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("job_listings")
      .select("id, source, source_slug")
      .lt("fetched_at", jobsCutoff)
      .range(offset, offset + 999);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ id: string; source: string; source_slug: string | null }>;
    if (rows.length === 0) break;
    for (const r of rows) {
      if (referencedByMatches.has(r.id)) continue;
      if (r.source_slug && watchedKeys.has(`${r.source}::${r.source_slug}`)) continue;
      idsToDelete.push(r.id);
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }

  let jobsDeleted = 0;
  for (let i = 0; i < idsToDelete.length; i += CHUNK) {
    const chunk = idsToDelete.slice(i, i + CHUNK);
    const { error } = await supabaseAdmin.from("job_listings").delete().in("id", chunk);
    if (error) throw error;
    jobsDeleted += chunk.length;
  }

  const { count: usageDeleted, error: uErr } = await supabaseAdmin
    .from("usage_daily")
    .delete({ count: "exact" })
    .lt("day", usageCutoff);
  if (uErr) throw uErr;

  return {
    ok: true,
    job_listings_deleted: jobsDeleted,
    job_listings_preserved_matches: referencedByMatches.size,
    job_listings_preserved_watched_slugs: watchedKeys.size,
    usage_daily_deleted: usageDeleted ?? 0,
  };
}


export const Route = createFileRoute("/api/public/hooks/cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apikey = request.headers.get("apikey") ?? "";
        if (!anon || apikey !== anon) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const summary = await runCleanup();
          return Response.json(summary);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "cleanup failed";
          console.error("cleanup failed:", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
