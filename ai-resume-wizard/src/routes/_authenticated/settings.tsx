import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyUsage } from "@/lib/resume.functions";
import { getRewriteEntitlement } from "@/lib/rewrite.functions";
import { getMyNotificationPrefs, setMyNotificationPrefs } from "@/lib/notifications.functions";
import {
  getMyBillingStatus,
  createCheckoutSession,
  createBillingPortalSession,
} from "@/lib/billing.functions";
import { signOut } from "@/lib/session";
import { PLAN_CAPS, ACTION_LABEL, type UsageAction, type Plan } from "@/lib/usage";

import {
  listMyApiTokens,
  createMyApiToken,
  revokeMyApiToken,
  type ApiTokenMeta,
} from "@/lib/tokens.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Settings — AI Job Kit" }, { name: "robots", content: "noindex,nofollow" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: SettingsPage,
});

const ACTIONS: UsageAction[] = [
  "tailor",
  "cover_letter",
  "interview_prep",
  "linkedin",
  "referral_dm",
  "parse_resume",
  "chat",
];

function SettingsPage() {
  const usageFn = useServerFn(getMyUsage);
  const q = useQuery({ queryKey: ["my-usage"], queryFn: () => usageFn() });

  const plan = q.data?.plan ?? "free";
  const counts = q.data?.counts ?? {};

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-3xl">
        <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
          ← Application kit
        </Link>
        <header className="mt-8 border-b border-border pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </p>
          <h1
            className="mt-3 text-4xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Your plan &amp; usage
          </h1>
        </header>

        <BillingSection plan={plan} />

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
          {plan === "free" && (
            <p className="mt-4 text-xs text-muted-foreground">
              Higher daily limits are a Pro feature.
            </p>
          )}
        </section>

        <NotificationsSection />

        <RewriteEntitlementSection />

        <p className="mt-6 text-xs text-muted-foreground">
          Limits are enforced server-side. When a daily limit is hit, the app returns a "daily limit
          reached" message until midnight UTC.
        </p>

        <SecuritySection />

        <BrowserExtensionSection />
      </div>
    </main>
  );
}

const PRO_HIGHLIGHTS: { action: UsageAction; label: string }[] = [
  { action: "tailor", label: "Resume tailoring" },
  { action: "cover_letter", label: "Cover letters" },
  { action: "interview_prep", label: "Interview prep" },
  { action: "chat", label: "Chat assistant" },
];

function BillingSection({ plan }: { plan: Plan }) {
  const statusFn = useServerFn(getMyBillingStatus);
  const checkoutFn = useServerFn(createCheckoutSession);
  const portalFn = useServerFn(createBillingPortalSession);
  const [err, setErr] = useState<string | null>(null);

  const status = useQuery({ queryKey: ["billing-status"], queryFn: () => statusFn() });

  const checkout = useMutation({
    mutationFn: () => checkoutFn(),
    onSuccess: (r) => {
      window.location.href = r.url;
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Could not start checkout."),
  });

  const portal = useMutation({
    mutationFn: () => portalFn(),
    onSuccess: (r) => {
      window.location.href = r.url;
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Could not open billing."),
  });

  const subStatus = status.data?.subscriptionStatus ?? null;

  return (
    <section id="billing" className="mt-8 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Current plan</p>
          <p className="mt-1 text-2xl font-bold capitalize">{plan}</p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            plan === "free" ? "border-border text-muted-foreground" : "border-primary text-primary"
          }`}
        >
          {plan === "free" ? "Free tier" : plan === "founder" ? "Complimentary" : "Pro"}
        </span>
      </div>

      {plan === "free" && (
        <div className="mt-5 rounded-md border border-primary/40 bg-primary/5 p-5">
          <p className="text-lg font-semibold">Upgrade to Pro — $19/month</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Same tools, far more room to use them. Cancel any time.
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {PRO_HIGHLIGHTS.map((h) => (
              <li key={h.action} className="flex justify-between gap-4">
                <span>{h.label}</span>
                <span className="text-muted-foreground">
                  {PLAN_CAPS.free[h.action]} → {PLAN_CAPS.pro[h.action]} per day
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-4">
              <span>Full resume rewrite tool</span>
              <span className="text-muted-foreground">Included</span>
            </li>
          </ul>
          <button
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
            className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {checkout.isPending ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Payment is handled by Stripe. Your plan updates once the payment is confirmed.
          </p>
        </div>
      )}

      {plan === "pro" && (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">
            You're on Pro — $19/month
            {subStatus ? ` · subscription ${subStatus}` : ""}.
          </p>
          <button
            onClick={() => portal.mutate()}
            disabled={portal.isPending}
            className="mt-4 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {portal.isPending ? "Opening…" : "Manage billing"}
          </button>
        </div>
      )}

      {plan === "founder" && (
        <p className="mt-4 text-sm text-muted-foreground">
          Complimentary founder account — all Pro limits, nothing to pay.
        </p>
      )}

      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
    </section>
  );
}

function NotificationsSection() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyNotificationPrefs);
  const setFn = useServerFn(setMyNotificationPrefs);
  const q = useQuery({ queryKey: ["notification-prefs"], queryFn: () => getFn() });
  const m = useMutation({
    mutationFn: (email_notifications: boolean) => setFn({ data: { email_notifications } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
  const on = q.data?.email_notifications ?? true;
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Email notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Email me a weekly digest of new matches and follow-up reminders.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={q.isLoading || m.isPending}
          onClick={() => m.mutate(!on)}
          className={
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 " +
            (on ? "bg-primary" : "bg-muted")
          }
        >
          <span
            className={
              "inline-block h-5 w-5 transform rounded-full bg-background transition-transform " +
              (on ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </button>
      </div>
      {m.isError && <p className="mt-2 text-sm text-destructive">Couldn't update preferences.</p>}
    </section>
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
        <p className="mt-3 text-sm text-muted-foreground">Available on the Pro plan.</p>
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
        forms with your saved profile. The extension only reads your data — it never submits forms
        or bypasses CAPTCHAs.
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

function SecuritySection() {
  const [busy, setBusy] = useState(false);

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Security</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You're signed out automatically after 8 hours of inactivity. On a shared or public computer,
        sign out when you're finished.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setBusy(true);
            void signOut();
          }}
          disabled={busy}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          Sign out
        </button>
        <button
          onClick={() => {
            if (
              !window.confirm(
                "Sign out of all devices? Every browser and device signed in as you will need to sign in again.",
              )
            )
              return;
            setBusy(true);
            void signOut({ scope: "global" });
          }}
          disabled={busy}
          className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {busy ? "Signing out…" : "Sign out of all devices"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        "All devices" revokes every active session for your account — use it if you think you left
        yourself signed in somewhere.
      </p>
    </section>
  );
}
