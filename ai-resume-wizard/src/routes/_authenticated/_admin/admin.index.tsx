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
  const [magic, setMagic] = useState<{ email: string; link: string } | null>(null);

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
      if (res.magicLink) setMagic({ email: res.email, link: res.magicLink });
    },
  });
  const resend = useMutation({
    mutationFn: (v: { id: string }) => resendFn({ data: v }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      if (res.magicLink) setMagic({ email: res.email, link: res.magicLink });
    },
  });

  const filteredUsers = useMemo(() => {
    const list = users.data?.users ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name ?? "").toLowerCase().includes(q),
    );
  }, [users.data, search]);

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
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Users</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or name"
              className="w-64 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Plan</th>
                  <th className="px-3 py-2 font-semibold">Joined</th>
                  <th className="px-3 py-2 font-semibold">Onboarded</th>
                  <th className="px-3 py-2 font-semibold">Resume</th>
                  <th className="px-3 py-2 font-semibold">Today</th>
                  <th className="px-3 py-2 font-semibold">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.isLoading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!users.isLoading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
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
            <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Magic link for {magic.email}
              </p>
              <p className="mt-2 break-all font-mono text-xs">{magic.link}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(magic.link)}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                >
                  Copy
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
                      {r.status === "pending" && (
                        <div className="inline-flex gap-2">
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
                        </div>
                      )}
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
