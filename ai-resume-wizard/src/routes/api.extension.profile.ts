import { createFileRoute } from "@tanstack/react-router";

// Public HTTP endpoint used by the companion browser extension. Authenticated
// via a personal access token issued in Settings — NOT a Supabase session JWT.
// Strictly read-only: returns flattened profile fields for form autofill. No
// writes other than bumping the token's last_used_at on success.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export const Route = createFileRoute("/api/extension/profile")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const m = auth.match(/^Bearer\s+(.+)$/i);
        if (!m) return jsonResponse({ error: "Missing bearer token" }, 401);
        const token = m[1].trim();

        const { sha256Hex } = await import("@/lib/tokens.functions");
        const token_hash = await sha256Hex(token);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tokRow, error: tokErr } = await supabaseAdmin
          .from("api_tokens")
          .select("id, user_id")
          .eq("token_hash", token_hash)
          .maybeSingle();
        if (tokErr || !tokRow) return jsonResponse({ error: "Invalid token" }, 401);

        const userId = tokRow.user_id;

        const [{ data: profile }, { data: resumeRow }] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("full_name, email, screener_answers")
            .eq("id", userId)
            .maybeSingle(),
          supabaseAdmin
            .from("resumes")
            .select("data")
            .eq("user_id", userId)
            .eq("is_primary", true)
            .maybeSingle(),
        ]);

        type MaybeResume = {
          name?: string;
          email?: string;
          phone?: string;
          location?: string;
          linkedin?: string;
          github?: string;
        } | null;
        const resume = (resumeRow?.data ?? null) as MaybeResume;

        const payload = {
          full_name: profile?.full_name ?? resume?.name ?? "",
          email: profile?.email ?? resume?.email ?? "",
          phone: resume?.phone ?? "",
          location: resume?.location ?? "",
          linkedin: resume?.linkedin ?? "",
          github: resume?.github ?? "",
          screener_answers: (profile?.screener_answers as Array<{ q: string; a: string }> | null) ?? [],
        };

        // Await the tracking write: on Workers, unawaited promises after the
        // Response is returned are frequently dropped when the isolate is torn
        // down. A single indexed UPDATE is cheap; correctness > shaving ms.
        // Wrapped in try/catch so a tracking failure never breaks the payload.
        try {
          const { error: updErr } = await supabaseAdmin
            .from("api_tokens")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", tokRow.id);
          if (updErr) console.warn("[extension.profile] last_used_at update failed", updErr);
        } catch (err) {
          console.warn("[extension.profile] last_used_at update threw", err);
        }

        return jsonResponse(payload);
      },
    },
  },
});
