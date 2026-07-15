import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyUsage } from "@/lib/resume.functions";
import { getRewriteEntitlement } from "@/lib/rewrite.functions";
import { getMyNotificationPrefs, setMyNotificationPrefs } from "@/lib/notifications.functions";
import { PLAN_CAPS, ACTION_LABEL, type UsageAction } from "@/lib/usage";
import {
  listMyApiTokens,
  createMyApiToken,
  revokeMyApiToken,
  type ApiTokenMeta,
} from "@/lib/tokens.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: SettingsPage,
});

const ACTIONS: UsageAction[] = ["tailor", "cover_letter", "interview_prep", "linkedin", "referral_dm", "parse_resume", "chat"];

function SettingsPage() {
  const usageFn = useServerFn(getMyUsage);
  const q = useQuery({ queryKey: ["my-usage"], queryFn: () => usageFn() });

  const plan = q.data?.plan ?? "free";
  const counts = q.data?.counts ?? {};

  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
          ← Application kit
        </Link>
        <header className="mt-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Your plan &amp; usage
          </h1>
        </header>

        <section className="mt-8 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Current plan</p>
              <p className="mt-1 text-2xl font-bold capitalize">{plan}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
              plan === "free" ? "border-border text-muted-foreground" : "border-primary text-primary"
            }`}>
              {plan === "free" ? "Free tier" : "Paid tier"}
            </span>
          </div>
          {plan === "free" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Upgrades unlock higher daily AI limits. Billing isn't wired up yet — reach out if
              you want a paid tier enabled.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Today's AI usage</h2>
          <p className="mt-1 text-xs text-muted-foreground">Resets at midnight UTC.</p>
          <div className="mt-5 space-y-3">
            {ACTIONS.map((a) => {
              const used = counts[a] ?? 0;
              const cap = PLAN_CAPS[plan][a];
              const pct = Math.min(100, Math.round((used / cap) * 100));
              const near = used / cap >= 0.8;
              return (
                <div key={a}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{ACTION_LABEL[a]}</span>
                    <span className={near ? "text-destructive" : "text-muted-foreground"}>
                      {used} / {cap}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full ${near ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {q.isLoading && <p className="mt-4 text-xs text-muted-foreground">Loading…</p>}
        </section>

        <NotificationsSection />

        <RewriteEntitlementSection />

        <p className="mt-6 text-xs text-muted-foreground">
          Limits are enforced server-side. When a daily limit is hit, the app returns a
          "daily limit reached" message until midnight UTC.
        </p>

        <BrowserExtensionSection />
      </div>
    </main>
  );
}

function RewriteEntitlementSection() {
  const entFn = useServerFn(getRewriteEntitlement);
  const ent = useQuery({ queryKey: ["rewrite-entitlement"], queryFn: () => entFn() });
  const status = ent.data;
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Resume rewrite</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            One included comprehensive rewrite of your whole resume, per plan.
          </p>
        </div>
        {status && (
          <span
            className={
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium " +
              (status.allowed
                ? "border-primary text-primary"
                : "border-border text-muted-foreground")
            }
          >
            {status.reason === "free_plan"
              ? "Pro feature"
              : status.reason === "founder_unlimited"
                ? "Unlimited (founder)"
                : status.allowed
                  ? "Available"
                  : "Used"}
          </span>
        )}
      </div>
      {status?.allowed && (
        <p className="mt-3 text-sm">
          <Link to="/apply/rewrite" className="text-primary hover:underline">
            Open the rewrite tool →
          </Link>
        </p>
      )}
      {status?.reason === "already_used" && (
        <p className="mt-3 text-sm text-muted-foreground">
          You've used your included rewrite. Additional rewrites are a paid add-on.
        </p>
      )}
      {status?.reason === "free_plan" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Available on the Pro plan.
        </p>
      )}
      {status?.reason === "founder_unlimited" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Founder plan — rewrite as many times as you want.
        </p>
      )}
    </section>
  );
}

function BrowserExtensionSection() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyApiTokens);
  const createFn = useServerFn(createMyApiToken);
  const revokeFn = useServerFn(revokeMyApiToken);

  const [label, setLabel] = useState("Browser extension");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tokens = useQuery({ queryKey: ["api-tokens"], queryFn: () => listFn() });

  const create = useMutation({
    mutationFn: () => createFn({ data: { label: label || "Browser extension" } }),
    onSuccess: (r) => {
      setFreshToken(r.token);
      setErr(null);
      qc.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed to generate token."),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-tokens"] }),
  });

  const copyToken = async () => {
    if (!freshToken) return;
    await navigator.clipboard.writeText(freshToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Browser extension</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate a personal access token so the companion extension can autofill job-application
        forms with your saved profile. The extension only reads your data — it never submits
        forms or bypasses CAPTCHAs.
      </p>

      {freshToken ? (
        <div className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Copy this token now
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the only time we'll show it. Paste it into the extension's settings — if you
            lose it, revoke it and generate a new one.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-background px-3 py-2 text-xs">
              {freshToken}
            </code>
            <button
              onClick={copyToken}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setFreshToken(null)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            I've saved it — dismiss
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Chrome — laptop)"
            className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {create.isPending ? "Generating…" : "Generate token"}
          </button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Active tokens
        </p>
        {tokens.isLoading && <p className="mt-2 text-xs text-muted-foreground">Loading…</p>}
        {tokens.data && tokens.data.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No tokens yet.</p>
        )}
        {tokens.data && tokens.data.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {tokens.data.map((t: ApiTokenMeta) => (
              <li key={t.id} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(t.created_at).toLocaleDateString()} · Last used{" "}
                    {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : "never"}
                  </p>
                </div>
                <button
                  onClick={() => revoke.mutate(t.id)}
                  disabled={revoke.isPending}
                  className="ml-3 shrink-0 rounded-md border border-border px-3 py-1 text-xs font-medium text-destructive hover:bg-muted disabled:opacity-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Endpoint: <code>GET /api/extension/profile</code> — send{" "}
        <code>Authorization: Bearer &lt;token&gt;</code>.
      </p>
    </section>
  );
}
