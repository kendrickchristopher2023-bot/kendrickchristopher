import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getMyUsage } from "@/lib/resume.functions";
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

const ACTIONS: UsageAction[] = ["tailor", "cover_letter", "interview_prep", "linkedin", "referral_dm", "parse_resume"];

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

        <p className="mt-6 text-xs text-muted-foreground">
          Limits are enforced server-side. When a daily limit is hit, the app returns a
          "daily limit reached" message until midnight UTC.
        </p>
      </div>
    </main>
  );
}
