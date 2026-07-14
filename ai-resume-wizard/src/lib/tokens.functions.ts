import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApiTokenMeta = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
};

// Web Crypto helpers (available in the Worker runtime).
function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const listMyApiTokens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApiTokenMeta[]> => {
    const { data, error } = await context.supabase
      .from("api_tokens")
      .select("id, label, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ApiTokenMeta[];
  });

export const createMyApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ label: z.string().min(1).max(80).default("Browser extension") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ token: string; meta: ApiTokenMeta }> => {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    // Prefix makes the token easy to identify in logs / dashboards.
    const token = `aijk_${b64url(raw)}`;
    const token_hash = await sha256Hex(token);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("api_tokens")
      .insert({ user_id: context.userId, token_hash, label: data.label })
      .select("id, label, created_at, last_used_at")
      .single();
    if (error) throw error;
    return { token, meta: row as ApiTokenMeta };
  });

export const revokeMyApiToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_tokens")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
