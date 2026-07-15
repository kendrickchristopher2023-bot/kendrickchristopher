import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listAccessRequests,
  reviewAccessRequest,
  resendAccessLink,
  listUsersAdmin,
  updateUserPlanAdmin,
  setUserAccessAdmin,
  listAdminAuditLog,
  getAdminAnalytics,
} from "@/lib/admin.functions";
import { getAppStatus, setAppStatus } from "@/lib/app-status.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminDashboard,
});

const PLANS = ["free", "pro", "founder"] as const;

// Format an ISO timestamp in US Eastern time with an explicit "ET" suffix.
// Uses toLocaleString with timeZone so DST is handled automatically.
function formatEasternDateTime(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const formatted = d.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${formatted} ET`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 0) return "just now";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

const FUNNEL_STAGES = [
  "applied",
  "response",
  "screen",
  "onsite",
  "offer",
  "rejected",
  "withdrawn",
] as const;

function AdminDashboard() {
  const qc = useQueryClient();
  const usersFn = useServerFn(listUsersAdmin);
  const analyticsFn = useServerFn(getAdminAnalytics);
  const requestsFn = useServerFn(listAccessRequests);
  const auditFn = useServerFn(listAdminAuditLog);
  const planFn = useServerFn(updateUserPlanAdmin);
  const accessFn = useServerFn(setUserAccessAdmin);
  const reviewFn = useServerFn(reviewAccessRequest);
  const resendFn = useServerFn(resendAccessLink);

  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => usersFn() });
  const analytics = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => analyticsFn(),
  });
  const requests = useQuery({
    queryKey: ["admin", "access-requests"],
    queryFn: () => requestsFn(),
  });
  const audit = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => auditFn(),
  });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "joined_desc" | "joined_asc" | "login_desc" | "login_asc" | "login_never_first"
  >("joined_desc");
  const [magic, setMagic] = useState<{
    email: string;
    link: string;
    emailSent: boolean;
    emailError: string | null;
  } | null>(null);


  const changePlan = useMutation({
    mutationFn: (v: { userId: string; plan: (typeof PLANS)[number] }) =>
      planFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
  const toggleAccess = useMutation({
    mutationFn: (v: { userId: string; revoked: boolean }) =>
      accessFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
    },
  });
  const review = useMutation({
    mutationFn: async (v: { id: string; approve: boolean; email: string }) => {
      const res = await reviewFn({ data: { id: v.id, approve: v.approve } });
      return { ...res, email: v.email };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "access-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      if (res.magicLink)
        setMagic({
          email: res.email,
          link: res.magicLink,
          emailSent: !!res.emailSent,
          emailError: res.emailError ?? null,
        });
    },
  });
  const resend = useMutation({
    mutationFn: (v: { id: string }) => resendFn({ data: v }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      if (res.magicLink)
        setMagic({
          email: res.email,
          link: res.magicLink,
          emailSent: !!res.emailSent,
          emailError: res.emailError ?? null,
        });
    },
  });

  const filteredUsers = useMemo(() => {
    const list = users.data?.users ?? [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.full_name ?? "").toLowerCase().includes(q),
        )
      : list;
    const t = (v: string | null | undefined) => (v ? new Date(v).getTime() : 0);
    const sorted = [...filtered];
    switch (sortBy) {
      case "joined_desc":
        sorted.sort((a, b) => t(b.created_at) - t(a.created_at));
        break;
      case "joined_asc":
        sorted.sort((a, b) => t(a.created_at) - t(b.created_at));
        break;
      case "login_desc":
        // Never-signed-in last.
        sorted.sort((a, b) => t(b.last_sign_in_at) - t(a.last_sign_in_at));
        break;
      case "login_asc":
        // Least-recently-active first; never-signed-in last.
        sorted.sort(
          (a, b) =>
            (t(a.last_sign_in_at) || Number.MAX_SAFE_INTEGER) -
            (t(b.last_sign_in_at) || Number.MAX_SAFE_INTEGER),
        );
        break;
      case "login_never_first":
        sorted.sort(
          (a, b) =>
            (t(a.last_sign_in_at) || -1) - (t(b.last_sign_in_at) || -1),
        );
        break;
    }
    return sorted;
  }, [users.data, search, sortBy]);


  const maxUsage = Math.max(
    1,
    ...Object.values(analytics.data?.usageTotals ?? { x: 0 }),
  );
  const maxFunnel = Math.max(
    1,
    ...FUNNEL_STAGES.map((s) => analytics.data?.funnel?.[s] ?? 0),
  );
  const maxSignups = Math.max(
    1,
    ...(analytics.data?.signups ?? []).map((s) => s.count),
  );

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex items-end justify-between gap-4">
          <div>
            <Link
              to="/apply"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              ← Back to kit
            </Link>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Admin dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Users, usage, and access requests.
            </p>
          </div>
        </header>

        <SiteStatusPanel />



        {/* Analytics */}
        <section className="grid gap-6 md:grid-cols-3">
          <Card title="Signups (last 30 days)">
            <div className="flex h-32 items-end gap-1">
              {(analytics.data?.signups ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No signups yet.</p>
              )}
              {(analytics.data?.signups ?? []).map((s) => (
                <div
                  key={s.day}
                  className="flex-1 rounded-t bg-primary/70"
                  style={{ height: `${(s.count / maxSignups) * 100}%` }}
                  title={`${s.day}: ${s.count}`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Total:{" "}
              {(analytics.data?.signups ?? []).reduce(
                (a, b) => a + b.count,
                0,
              )}
            </p>
          </Card>
          <Card title="Usage by action (last 30 days)">
            <ul className="space-y-1 text-xs">
              {Object.entries(analytics.data?.usageTotals ?? {}).map(
                ([k, v]) => (
                  <li key={k}>
                    <div className="flex justify-between">
                      <span>{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                    <div className="h-1 rounded bg-muted">
                      <div
                        className="h-1 rounded bg-primary"
                        style={{ width: `${(v / maxUsage) * 100}%` }}
                      />
                    </div>
                  </li>
                ),
              )}
            </ul>
          </Card>
          <Card title="Application funnel (all-time)">
            <ul className="space-y-1 text-xs">
              {FUNNEL_STAGES.map((stage) => {
                const v = analytics.data?.funnel?.[stage] ?? 0;
                return (
                  <li key={stage}>
                    <div className="flex justify-between">
                      <span className="capitalize">{stage}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                    <div className="h-1 rounded bg-muted">
                      <div
                        className="h-1 rounded bg-primary"
                        style={{ width: `${(v / maxFunnel) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>

        {/* Users */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Users</h2>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                title="Sort users"
              >
                <option value="joined_desc">Sort: Newest joined</option>
                <option value="joined_asc">Sort: Oldest joined</option>
                <option value="login_desc">Sort: Most-recently active</option>
                <option value="login_asc">Sort: Least-recently active (never last)</option>
                <option value="login_never_first">Sort: Never signed in first</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email or name"
                className="w-64 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                  <th className="px-3 py-2 font-semibold">Onboarded</th>
                  <th className="px-3 py-2 font-semibold">
                    <button
                      type="button"
                      onClick={() =>
                        setSortBy((s) => (s === "login_desc" ? "login_asc" : "login_desc"))
                      }
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      title="Click to sort by last sign-in"
                    >
                      Last login (ET)
                      <span className="text-muted-foreground">
                        {sortBy === "login_desc" ? "↓" : sortBy === "login_asc" ? "↑" : "↕"}
                      </span>
                    </button>
                  </th>
                  <th className="px-3 py-2 font-semibold">Resume</th>
                  <th className="px-3 py-2 font-semibold">Today</th>
                  <th className="px-3 py-2 font-semibold">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.isLoading && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!users.isLoading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                      No users.
                    </td>
                  </tr>
                )}

                {filteredUsers.map((u) => (
                  <tr key={u.id} className={u.banned ? "opacity-60" : ""}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{u.email}</div>
                      {u.full_name && (
                        <div className="text-xs text-muted-foreground">
                          {u.full_name}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={u.plan}
                        disabled={changePlan.isPending}
                        onChange={(e) =>
                          changePlan.mutate({
                            userId: u.id,
                            plan: e.target.value as (typeof PLANS)[number],
                          })
                        }
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {u.onboarded_at
                        ? new Date(u.onboarded_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {formatEasternDateTime(u.last_sign_in_at)}
                    </td>

                    <td className="px-3 py-2 text-xs">
                      {u.has_primary_resume ? "✓" : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">{u.usage_today}</td>
                    <td className="px-3 py-2">
                      {u.banned ? (
                        <button
                          onClick={() =>
                            toggleAccess.mutate({ userId: u.id, revoked: false })
                          }
                          disabled={toggleAccess.isPending}
                          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Revoke sign-in for ${u.email}? Their data is preserved and access can be restored.`,
                              )
                            ) {
                              toggleAccess.mutate({
                                userId: u.id,
                                revoked: true,
                              });
                            }
                          }}
                          disabled={toggleAccess.isPending}
                          className="rounded-md border border-input px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Metadata only — resume content, tailored output, and cover letters
            aren't shown here.
          </p>
        </section>

        {/* Access requests */}
        <section>
          <h2 className="text-xl font-semibold">Access requests</h2>
          {magic && (
            <div
              className={
                "mt-3 rounded-lg border p-3 " +
                (magic.emailSent
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-amber-500/40 bg-amber-500/5")
              }
            >
              <p
                className={
                  "text-xs font-semibold uppercase tracking-wider " +
                  (magic.emailSent ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300")
                }
              >
                {magic.emailSent
                  ? `✓ Sign-in email sent to ${magic.email}`
                  : `Magic link for ${magic.email} — email not sent, copy manually`}
              </p>
              {!magic.emailSent && magic.emailError && (
                <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                  {magic.emailError}
                </p>
              )}
              <p className="mt-2 break-all font-mono text-xs">{magic.link}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(magic.link)}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                >
                  Copy link
                </button>
                <button
                  onClick={() => setMagic(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Reason</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(requests.data?.requests ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No requests.
                    </td>
                  </tr>
                )}
                {(requests.data?.requests ?? []).map((r: {
                  id: string;
                  email: string;
                  full_name: string | null;
                  reason: string | null;
                  status: string;
                }) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-medium">{r.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.full_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-sm">
                      <span className="line-clamp-2">{r.reason ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          r.status === "approved"
                            ? "text-primary"
                            : r.status === "denied"
                              ? "text-muted-foreground line-through"
                              : ""
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-2">
                        {r.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                review.mutate({
                                  id: r.id,
                                  approve: true,
                                  email: r.email,
                                })
                              }
                              disabled={review.isPending}
                              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                review.mutate({
                                  id: r.id,
                                  approve: false,
                                  email: r.email,
                                })
                              }
                              disabled={review.isPending}
                              className="rounded-md border border-input px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                            >
                              Deny
                            </button>
                          </>
                        )}
                        {r.status !== "denied" && (
                          <button
                            onClick={() => resend.mutate({ id: r.id })}
                            disabled={resend.isPending}
                            title="Mint a fresh magic link (use if the previous one expired)"
                            className="rounded-md border border-input px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                          >
                            Resend link
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Audit log */}
        <section>
          <h2 className="text-xl font-semibold">Recent admin actions</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">When</th>
                  <th className="px-3 py-2 font-semibold">Admin</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Target</th>
                  <th className="px-3 py-2 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(audit.data?.entries ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                      No actions logged yet.
                    </td>
                  </tr>
                )}
                {(audit.data?.entries ?? []).map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs">{e.admin_email}</td>
                    <td className="px-3 py-2 text-xs font-mono">{e.action}</td>
                    <td className="px-3 py-2 text-xs">{e.target_email ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {e.details && Object.keys(e.details as object).length
                        ? JSON.stringify(e.details)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SiteStatusPanel() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAppStatus);
  const setFn = useServerFn(setAppStatus);
  const status = useQuery({
    queryKey: ["app-status"],
    queryFn: () => getFn(),
  });
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  const currentMessage = status.data?.message ?? "";
  const shownMessage = dirty ? message : currentMessage;

  const save = useMutation({
    mutationFn: (v: { active: boolean; message: string | null }) =>
      setFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-status"] });
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      setDirty(false);
    },
  });

  const active = !!status.data?.active;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Site status banner</h2>
          <p className="text-xs text-muted-foreground">
            Shows a live notice to every signed-in user. Polls every 30s.
          </p>
        </div>
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-medium " +
            (active
              ? "bg-amber-500/20 text-amber-900 dark:text-amber-100"
              : "bg-muted text-muted-foreground")
          }
        >
          {active ? "Active" : "Off"}
        </span>
      </div>
      <textarea
        value={shownMessage}
        onChange={(e) => {
          setMessage(e.target.value);
          setDirty(true);
        }}
        placeholder="e.g. Deploying changes — brief interruptions possible."
        rows={2}
        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() =>
            save.mutate({ active: true, message: shownMessage.trim() || null })
          }
          disabled={save.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {active ? "Update banner" : "Turn on"}
        </button>
        <button
          onClick={() =>
            save.mutate({ active: false, message: shownMessage.trim() || null })
          }
          disabled={save.isPending || !active}
          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          Turn off
        </button>
        {status.data?.updated_at && (
          <span className="ml-auto self-center text-xs text-muted-foreground">
            Last updated {new Date(status.data.updated_at).toLocaleString()}
          </span>
        )}
      </div>
    </section>
  );
}

