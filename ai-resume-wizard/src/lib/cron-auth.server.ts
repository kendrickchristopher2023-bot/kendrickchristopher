// Verifies the `x-cron-secret` header against an internal token stored in
// public.cron_secret (readable only by service_role). Replaces the previous
// pattern of gating cron endpoints on the public Supabase anon key, which
// ships in every browser bundle.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

let cachedToken: string | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

async function loadToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now - cachedAt < TTL_MS) return cachedToken;
  const { data, error } = await supabaseAdmin
    .from("cron_secret")
    .select("token")
    .eq("id", true)
    .maybeSingle();
  if (error || !data?.token) return null;
  cachedToken = data.token as string;
  cachedAt = now;
  return cachedToken;
}

// Timing-safe compare on same-length strings.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifyCronRequest(request: Request): Promise<boolean> {
  const header = request.headers.get("x-cron-secret") ?? "";
  if (!header) return false;
  const token = await loadToken();
  if (!token) return false;
  return safeEqual(header, token);
}

export function unauthorizedCronResponse(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
