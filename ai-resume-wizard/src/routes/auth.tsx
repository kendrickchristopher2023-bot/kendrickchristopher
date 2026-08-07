import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const searchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.string().optional(),
});


export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Application Kit" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  const redirectPath =
    search.redirect && search.redirect.startsWith("/") ? search.redirect : "/apply";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectPath });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        navigate({ to: redirectPath });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, redirectPath]);

  const handleGoogle = async () => {
    setBusy(true);
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setMsg({ kind: "error", text: result.error.message ?? "Google sign-in failed" });
      setBusy(false);
    }
    // On redirected or success, the effect above navigates.
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Sign-in failed",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setMsg({ kind: "error", text: "Enter your email above first." });
      return;
    }
    setBusy(true);
    setMsg(null);
    // shouldCreateUser: false — this must only ever email an EXISTING approved
    // user; it must never become a signup bypass. Supabase silently no-ops for
    // unknown addresses, and we show the same neutral confirmation either way
    // to avoid leaking account existence.
    try {
      await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin + "/auth",
        },
      });
    } catch {
      /* swallow — neutral response below */
    } finally {
      setBusy(false);
      setMsg({
        kind: "info",
        text: "If that email has an account, we've sent a sign-in link. Check your inbox.",
      });
    }
  };

  return (
    <main
      className="min-h-screen bg-background flex items-center justify-center px-6 py-16"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="w-full max-w-md">
        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <h1
          className="mt-6 text-3xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Welcome back to Application Kit
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your invite-only workspace. New here?{" "}
          <Link to="/request-access" className="text-primary hover:underline">
            Request access
          </Link>
          .
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            Continue with Google
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or email</span>
            </div>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "…" : "Sign in"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={busy}
            className="w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            Email me a sign-in link
          </button>
          <p className="text-xs text-muted-foreground">
            Forgot your password? Enter your email above and use the sign-in link
            option — we'll email you a one-click link if your account exists.
          </p>

          {msg && (
            <p
              className={
                msg.kind === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {msg.text}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
