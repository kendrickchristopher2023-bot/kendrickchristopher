import { useEffect, useRef } from "react";
import { LAST_ACTIVITY_KEY, signOut } from "@/lib/session";

/** Sign the user out after this much inactivity. */
const IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours
const CHECK_MS = 60 * 1000; // check once a minute

function readLastActivity(): number {
  try {
    const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeLastActivity(ts: number) {
  try {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
  } catch {
    /* ignore */
  }
}

/**
 * Client-side inactivity timeout. Supabase refresh tokens don't expire on
 * their own, so a session on a shared machine would otherwise live forever.
 * Activity is stored in localStorage so it's shared across tabs; an actively
 * working user never trips it.
 */
export function IdleTimeout() {
  const firedRef = useRef(false);

  useEffect(() => {
    const now = Date.now();
    const last = readLastActivity();
    // Stale beyond the window on mount => sign out immediately.
    if (last && now - last > IDLE_MS) {
      firedRef.current = true;
      void signOut({ to: "/auth?reason=timeout" });
      return;
    }
    writeLastActivity(now);

    let pending = 0;
    const touch = () => {
      const t = Date.now();
      // throttle writes to once every 30s
      if (t - pending < 30_000) return;
      pending = t;
      writeLastActivity(t);
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "focus"];
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const check = () => {
      if (firedRef.current) return;
      const l = readLastActivity();
      if (l && Date.now() - l > IDLE_MS) {
        firedRef.current = true;
        void signOut({ to: "/auth?reason=timeout" });
      }
    };
    const id = window.setInterval(check, CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, []);

  return null;
}
