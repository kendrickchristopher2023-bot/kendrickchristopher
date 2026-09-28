// Refresh endpoint. Called by pg_cron and by the admin "Refresh now" button.
//
// Two modes:
//   ?slice=<name>  — process one slice only (aggregator name or "watched").
//                    Bounded work, fits in one request-timeout budget.
//   no slice       — dispatch mode: fan out one net.http_post per slice via
//                    the dispatch_refresh_slices() SQL function and return
//                    202 immediately. Each slice then runs in its own Worker
//                    isolate so a slow source can never 502 the others.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/refresh-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyCronRequest, unauthorizedCronResponse } = await import(
          "@/lib/cron-auth.server"
        );
        if (!(await verifyCronRequest(request))) return unauthorizedCronResponse();

        const url = new URL(request.url);
        const slice = url.searchParams.get("slice");

        try {
          if (!slice) {
            // Dispatch mode — fan out and return 202.
            const { dispatchAllRefreshSlices } = await import("@/lib/jobs.refresh.server");
            const result = await dispatchAllRefreshSlices();
            return new Response(JSON.stringify({ ok: true, mode: "dispatch", ...result }), {
              status: 202,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { runRefreshSlice, isRefreshSlice } = await import("@/lib/jobs.refresh.server");
          if (!isRefreshSlice(slice)) {
            return Response.json({ ok: false, error: `unknown slice: ${slice}` }, { status: 400 });
          }
          const summary = await runRefreshSlice(slice);
          return Response.json({ ok: true, mode: "slice", summary });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "refresh failed";
          console.error(`refresh-jobs failed (slice=${slice ?? "dispatch"}):`, msg);
          return Response.json({ ok: false, error: msg, slice }, { status: 500 });
        }
      },
    },
  },
});
