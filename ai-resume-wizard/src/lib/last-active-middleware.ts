import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Throttle DB writes per user to at most one every 5 minutes. In-memory
// only (per Worker instance), so a cold instance may write once more than
// strictly necessary — cheap and avoids a read-before-write on every call.
const THROTTLE_MS = 5 * 60 * 1000;
const lastWriteAt = new Map<string, number>();

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
    const json = JSON.parse(
      typeof atob === "function"
        ? atob(pad)
        : Buffer.from(pad, "base64").toString("utf8"),
    );
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort profiles.last_active_at touch on every authenticated server
 * function call. Fire-and-forget: swallows all errors, never delays or
 * fails the caller's request. Throttled per-user in-memory to ~5 min.
 */
export const touchLastActive = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const result = await next();
    try {
      const req = getRequest();
      const auth = req?.headers.get("authorization") ?? "";
      if (!auth.startsWith("Bearer ")) return result;
      const sub = decodeJwtSub(auth.slice(7));
      if (!sub) return result;
      const now = Date.now();
      const prev = lastWriteAt.get(sub) ?? 0;
      if (now - prev < THROTTLE_MS) return result;
      lastWriteAt.set(sub, now);
      // Await the write. Same isolate-teardown race as the extension endpoint:
      // an unawaited promise after the middleware returns can be dropped on
      // Workers. Cost is bounded by the 5-min throttle — at most one indexed
      // UPDATE per user per 5 minutes pays a few ms; every other call is a
      // no-op map lookup. Errors are swallowed so tracking never breaks a
      // request.
      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        await supabaseAdmin
          .from("profiles")
          .update({ last_active_at: new Date(now).toISOString() })
          .eq("id", sub);
      } catch (err) {
        console.warn("[touchLastActive] update failed", err);
      }
    } catch {
      // never break the request
    }
    return result;
  },
);
