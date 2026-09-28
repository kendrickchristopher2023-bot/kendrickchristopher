// Public unsubscribe endpoint. Called from links in scheduled digest emails.
// Validates a per-user token stored on profiles.unsubscribe_token, then flips
// profiles.email_notifications to false. Renders a small HTML confirmation.
import { createFileRoute } from "@tanstack/react-router";

function page(title: string, body: string, ok: boolean) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <style>
        body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#fff;color:#0f172a;margin:0;padding:64px 24px;text-align:center}
        .card{max-width:480px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;padding:32px}
        h1{font-size:22px;margin:0 0 12px}
        p{color:#4b5563;margin:0 0 8px}
        a{color:#2563eb}
        .bad{color:#b91c1c}
      </style></head><body>
      <div class="card">
        <h1 class="${ok ? "" : "bad"}">${title}</h1>
        <p>${body}</p>
        <p style="margin-top:24px"><a href="https://excel-ai-resume.lovable.app/apply/settings">Back to settings</a></p>
      </div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function handle(userId: string | null, token: string | null) {
  if (!userId || !token) return page("Invalid link", "That unsubscribe link is missing information.", false);
  const uuidRe = /^[0-9a-f-]{36}$/i;
  if (!uuidRe.test(userId) || !uuidRe.test(token)) {
    return page("Invalid link", "That unsubscribe link isn't valid.", false);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, unsubscribe_token, email_notifications")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return page("Invalid link", "We couldn't find that account.", false);
  if (data.unsubscribe_token !== token) {
    return page("Invalid link", "That unsubscribe token doesn't match.", false);
  }
  if (!data.email_notifications) {
    return page("You're already unsubscribed", "No further scheduled emails will be sent.", true);
  }
  const { error: upErr } = await supabaseAdmin
    .from("profiles")
    .update({ email_notifications: false })
    .eq("id", userId);
  if (upErr) return page("Something went wrong", "Please try again in a minute.", false);
  return page("You're unsubscribed", "We won't send you scheduled digest emails. You can re-enable them anytime in Settings.", true);
}

export const Route = createFileRoute("/api/public/hooks/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        return handle(url.searchParams.get("u"), url.searchParams.get("t"));
      },
      POST: async ({ request }) => {
        const url = new URL(request.url);
        return handle(url.searchParams.get("u"), url.searchParams.get("t"));
      },
    },
  },
});
