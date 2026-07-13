import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAccessRequests, reviewAccessRequest } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/_admin/admin/invites")({
  head: () => ({
    meta: [
      { title: "Admin — Invites" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: AdminInvites,
});

function AdminInvites() {
  const listFn = useServerFn(listAccessRequests);
  const reviewFn = useServerFn(reviewAccessRequest);
  const qc = useQueryClient();
  const [magic, setMagic] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["access-requests"],
    queryFn: () => listFn(),
  });

  const review = useMutation({
    mutationFn: async (vars: { id: string; approve: boolean; email: string }) => {
      const res = await reviewFn({ data: { id: vars.id, approve: vars.approve } });
      return { ...res, email: vars.email };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["access-requests"] });
      if (res.magicLink) setMagic({ email: res.email, link: res.magicLink });
    },
  });

  const copyLink = async () => {
    if (!magic) return;
    await navigator.clipboard.writeText(magic.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-4xl">
        <Link to="/apply" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back to kit
        </Link>
        <h1
          className="mt-6 text-3xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Access requests
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve to mint a magic-link URL. Copy and send to the invitee — one click and they're in.
        </p>

        {magic && (
          <div className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Magic link for {magic.email}
            </p>
            <p className="mt-2 break-all text-xs text-foreground font-mono">{magic.link}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={copyLink}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                {copied ? "Copied ✓" : "Copy link"}
              </button>
              <a
                href={`mailto:${magic.email}?subject=${encodeURIComponent(
                  "You're in — Christopher Kendrick's application toolkit",
                )}&body=${encodeURIComponent(
                  `Hey — you're approved. One-click sign-in below (expires in 24 hours):\n\n${magic.link}\n\n—Christopher`,
                )}`}
                className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
              >
                Open in mail
              </a>
              <button
                onClick={() => setMagic(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="mt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load"}
          </p>
        )}

        {data && (
          <div className="mt-6 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Reason</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No requests yet.
                    </td>
                  </tr>
                )}
                {data.requests.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium">{r.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.full_name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs">
                      <span className="line-clamp-2">{r.reason ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          r.status === "approved"
                            ? "text-primary"
                            : r.status === "denied"
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "pending" && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() =>
                              review.mutate({ id: r.id, approve: true, email: r.email })
                            }
                            disabled={review.isPending}
                            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              review.mutate({ id: r.id, approve: false, email: r.email })
                            }
                            disabled={review.isPending}
                            className="rounded-md border border-input px-3 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
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
        )}
      </div>
    </main>
  );
}
