// Weekly digest hook. Runs after the Monday ranker via pg_cron.
// For every profile with email_notifications=true and a verified email:
//   - collect this-week's auto-weekly matches (personal_matches inserted since
//     the schedule window started, source='auto-weekly')
//   - collect follow-ups due (applications.stage='applied' and applied_at >= 7d)
//   - send weekly-digest email if either list is non-empty
//
// Recipients who have notifications off, no verified email, or an empty digest
// are skipped. Every digest carries a per-user unsubscribe link.

import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://excel-ai-resume.lovable.app";

type PersonalMatchRow = {
  company: string;
  role: string;
  location: string | null;
  created_at: string;
};

type ApplicationRow = {
  company: string;
  role: string;
  applied_at: string | null;
  stage: string;
};

async function runDigest() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

  // Lookback windows
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, email_notifications, unsubscribe_token")
    .eq("email_notifications", true);
  if (error) throw error;

  const results: Array<{ user_id: string; sent: boolean; matches: number; followups: number; reason?: string }> = [];

  for (const p of (profiles ?? []) as Array<{
    id: string;
    email: string | null;
    full_name: string | null;
    email_notifications: boolean;
    unsubscribe_token: string;
  }>) {
    try {
      // Verify email + confirmed status via auth admin
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id);
      const email = authUser?.user?.email;
      const confirmed =
        !!authUser?.user?.email_confirmed_at || !!authUser?.user?.confirmed_at;
      if (!email || !confirmed) {
        results.push({ user_id: p.id, sent: false, matches: 0, followups: 0, reason: "no_verified_email" });
        continue;
      }

      const { data: matchesData } = await supabaseAdmin
        .from("personal_matches")
        .select("company, role, location, created_at")
        .eq("user_id", p.id)
        .eq("source", "auto-weekly")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(10);
      const matches = ((matchesData ?? []) as PersonalMatchRow[]).map((m) => ({
        company: m.company,
        role: m.role,
        location: m.location,
      }));

      const { data: appsData } = await supabaseAdmin
        .from("applications")
        .select("company, role, applied_at, stage")
        .eq("user_id", p.id)
        .eq("stage", "applied");
      const followups = ((appsData ?? []) as ApplicationRow[])
        .filter((a) => a.applied_at && now - new Date(a.applied_at).getTime() >= 7 * 86_400_000)
        .map((a) => ({
          company: a.company,
          role: a.role,
          days_since: Math.floor((now - new Date(a.applied_at as string).getTime()) / 86_400_000),
        }))
        .sort((x, y) => y.days_since - x.days_since)
        .slice(0, 10);

      if (matches.length === 0 && followups.length === 0) {
        results.push({ user_id: p.id, sent: false, matches: 0, followups: 0, reason: "empty" });
        continue;
      }

      const unsubscribeUrl = `${SITE}/api/public/hooks/unsubscribe?u=${p.id}&t=${p.unsubscribe_token}`;

      const send = await sendTemplateEmail("weekly-digest", email, {
        templateData: {
          fullName: p.full_name,
          matches,
          followups,
          matchesUrl: `${SITE}/apply/matches`,
          followupsUrl: `${SITE}/apply/matches`,
          unsubscribeUrl,
        },
        idempotencyKey: `weekly-digest-${p.id}-${new Date().toISOString().slice(0, 10)}`,
      });

      results.push({
        user_id: p.id,
        sent: send.sent,
        matches: matches.length,
        followups: followups.length,
        reason: send.sent ? undefined : (send as { reason: string }).reason,
      });
    } catch (e) {
      results.push({
        user_id: p.id,
        sent: false,
        matches: 0,
        followups: 0,
        reason: e instanceof Error ? e.message : "digest failed",
      });
    }
  }

  return { ok: true, users: results.length, results };
}

export const Route = createFileRoute("/api/public/hooks/weekly-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyCronRequest, unauthorizedCronResponse } = await import(
          "@/lib/cron-auth.server"
        );
        if (!(await verifyCronRequest(request))) return unauthorizedCronResponse();
        try {
          const summary = await runDigest();
          return Response.json(summary);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "digest failed";
          console.error("weekly-digest failed:", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
