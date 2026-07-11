import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/request-access")({
  head: () => ({
    meta: [
      { title: "Request access — Christopher Kendrick" },
      {
        name: "description",
        content: "Request access to the application toolkit.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: RequestAccess,
});

function RequestAccess() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setState("idle");
    const { error } = await supabase.from("access_requests").insert({
      email: email.trim(),
      full_name: fullName.trim() || null,
      reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) {
      setState("error");
      setErrMsg(error.message);
      return;
    }
    setState("sent");
    setEmail("");
    setFullName("");
    setReason("");
  };

  return (
    <main
      className="min-h-screen bg-background px-6 py-16"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-xl">
        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
        <h1
          className="mt-6 text-4xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Request access
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          This is an invite-only toolkit for job seekers. Tell me who you are and
          why you want in, and I'll get back to you.
        </p>

        {state === "sent" ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-foreground">
              Got it — your request is in the queue. You'll hear back by email once
              approved.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                to="/"
                className="text-sm font-medium text-primary hover:underline"
              >
                Back home
              </Link>
              <button
                type="button"
                onClick={() => setState("idle")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Submit another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Full name
              </label>
              <input
                type="text"
                maxLength={200}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Why you want in
              </label>
              <textarea
                maxLength={2000}
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                placeholder="What are you job-hunting for? What'd you use this for?"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Request access"}
            </button>
            {state === "error" && (
              <p className="text-sm text-destructive">Something went wrong: {errMsg}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
