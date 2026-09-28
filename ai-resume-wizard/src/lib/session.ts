import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, loading, user: session?.user ?? null };
}

/** localStorage key holding the last interaction timestamp (ms). */
export const LAST_ACTIVITY_KEY = "ak.lastActivity";

/**
 * Sign out of this device (default) or every device (`scope: "global"`,
 * which revokes all refresh tokens for the user server-side).
 * Always clears local storage state and hard-navigates so no cached
 * protected data survives in memory.
 */
export async function signOut(opts?: { scope?: "local" | "global"; to?: string }) {
  const to = opts?.to ?? "/";
  try {
    await supabase.auth.signOut({ scope: opts?.scope ?? "local" });
  } catch {
    // even if the network call fails, clear locally below
  }
  try {
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
  window.location.href = to;
}
