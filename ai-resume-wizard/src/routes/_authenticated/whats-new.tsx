import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { listChangelog, markChangelogSeen } from "@/lib/changelog.functions";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/_authenticated/whats-new")({
  head: () => ({
    meta: [
      { title: "What's new" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WhatsNewPage,
});

function formatEasternDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
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

const CATEGORY_STYLES: Record<string, string> = {
  new: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  improved: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  fixed: "bg-amber-500/10 text-amber-700 border-amber-500/30",
};

function WhatsNewPage() {
  const listFn = useServerFn(listChangelog);
  const markFn = useServerFn(markChangelogSeen);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["changelog"],
    queryFn: () => listFn(),
  });

  const markSeen = useMutation({
    mutationFn: () => markFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["changelog-unread"] });
    },
  });

  // Stamp seen on first load once entries are known.
  useEffect(() => {
    if (q.data && q.data.unreadCount > 0 && !markSeen.isPending) {
      markSeen.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.unreadCount]);

  const entries = (q.data?.entries ?? []).filter((e) => e.published);

  return (
    <>
      <AppNav />
      <main className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Product updates
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              What's new
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Recent changes to Excel AI Resume. Dates shown in Eastern time.
            </p>
          </header>

          {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {q.error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {q.error instanceof Error ? q.error.message : "Failed to load."}
            </p>
          )}
          {!q.isLoading && entries.length === 0 && (
            <p className="rounded-md border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
              No updates yet — check back soon.
            </p>
          )}

          <ol className="space-y-6">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-border bg-card px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                      (CATEGORY_STYLES[e.category] ??
                        "bg-muted text-muted-foreground border-border")
                    }
                  >
                    {e.category}
                  </span>
                  <time className="text-xs text-muted-foreground">
                    {formatEasternDateTime(e.published_at ?? e.created_at)}
                  </time>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-foreground">{e.title}</h2>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {e.body}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </>
  );
}
