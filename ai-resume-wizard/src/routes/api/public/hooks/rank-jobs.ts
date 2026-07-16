// Weekly cron endpoint. Runs the auto-ranker for every user with a primary resume.
// One AI call per user per week; local keyword filter first keeps token cost tiny.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/rank-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyCronRequest, unauthorizedCronResponse } = await import(
          "@/lib/cron-auth.server"
        );
        if (!(await verifyCronRequest(request))) return unauthorizedCronResponse();
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { rankJobsForUser } = await import("@/lib/jobs.rank.server");

          const { data: rows, error } = await supabaseAdmin
            .from("resumes")
            .select("user_id, data")
            .eq("is_primary", true);
          if (error) throw error;

          const results: Array<{ user_id: string; ok: boolean; inserted?: number; error?: string }> = [];
          for (const r of (rows ?? []) as Array<{ user_id: string; data: unknown }>) {
            try {
              const summary = await rankJobsForUser({
                supabase: supabaseAdmin,
                userId: r.user_id,
                resume: r.data as never,
              });
              results.push({ user_id: r.user_id, ok: true, inserted: summary.inserted });
            } catch (e) {
              results.push({
                user_id: r.user_id,
                ok: false,
                error: e instanceof Error ? e.message : "rank failed",
              });
            }
          }
          return Response.json({ ok: true, users: results.length, results });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "rank failed";
          console.error("rank-jobs failed:", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
