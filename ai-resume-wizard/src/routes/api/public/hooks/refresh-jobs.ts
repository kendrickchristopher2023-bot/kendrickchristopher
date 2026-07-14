// Daily cron endpoint. Called by pg_cron with the anon apikey header.
// Refreshes public.job_listings by hitting every watched company's ATS.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/refresh-jobs")({
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
          const { runRefreshJobs } = await import("@/lib/jobs.refresh.server");
          const summary = await runRefreshJobs();
          return Response.json({ ok: true, summary });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "refresh failed";
          console.error("refresh-jobs failed:", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
