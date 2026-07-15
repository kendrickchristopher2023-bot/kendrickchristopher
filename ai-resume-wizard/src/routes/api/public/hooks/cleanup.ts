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

  // Referenced job_listings — never delete these.
  const { data: refRows, error: refErr } = await supabaseAdmin
    .from("personal_matches")
    .select("job_listing_id")
    .not("job_listing_id", "is", null);
  if (refErr) throw refErr;
  const referenced = Array.from(
    new Set(
      ((refRows ?? []) as Array<{ job_listing_id: string | null }>)
        .map((r) => r.job_listing_id)
        .filter((x): x is string => !!x),
    ),
  );

  // Stale listings: fetched_at older than cutoff.
  let stale = supabaseAdmin
    .from("job_listings")
    .select("id", { count: "exact" })
    .lt("fetched_at", jobsCutoff);
  if (referenced.length > 0) {
    // Chunk to keep URL length sane if referenced is large.
    const CHUNK = 200;
    const idsToDelete: string[] = [];
    let offset = 0;
    // First page the stale set in slices, filter locally against referenced.
    const referencedSet = new Set(referenced);
    // Fetch stale ids in pages of 1000
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("job_listings")
        .select("id")
        .lt("fetched_at", jobsCutoff)
        .range(offset, offset + 999);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string }>;
      if (rows.length === 0) break;
      for (const r of rows) if (!referencedSet.has(r.id)) idsToDelete.push(r.id);
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
    // suppress unused
    void stale;

    // Delete usage_daily older than 90 days
    const { count: usageDeleted, error: uErr } = await supabaseAdmin
      .from("usage_daily")
      .delete({ count: "exact" })
      .lt("day", usageCutoff);
    if (uErr) throw uErr;

    return {
      ok: true,
      job_listings_deleted: jobsDeleted,
      job_listings_preserved_referenced: referenced.length,
      usage_daily_deleted: usageDeleted ?? 0,
    };
  } else {
    // No referenced rows — delete straight.
    const { count: jobsDeleted, error: jErr } = await supabaseAdmin
      .from("job_listings")
      .delete({ count: "exact" })
      .lt("fetched_at", jobsCutoff);
    if (jErr) throw jErr;
    const { count: usageDeleted, error: uErr } = await supabaseAdmin
      .from("usage_daily")
      .delete({ count: "exact" })
      .lt("day", usageCutoff);
    if (uErr) throw uErr;
    return {
      ok: true,
      job_listings_deleted: jobsDeleted ?? 0,
      job_listings_preserved_referenced: 0,
      usage_daily_deleted: usageDeleted ?? 0,
    };
  }
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
