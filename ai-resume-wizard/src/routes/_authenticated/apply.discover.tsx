import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  addWatchedCompany,
  autoRankForCurrentUser,
  listJobListings,
  listWatchedCompanies,
  refreshWatchedNow,
  removeWatchedCompany,
  saveJobToMatches,
  type JobListing,
} from "@/lib/jobs.functions";
import { currentUserIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/apply/discover")({
  head: () => ({
    meta: [
      { title: "Discover Jobs — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const qc = useQueryClient();
  const listJobsFn = useServerFn(listJobListings);
  const listWatchedFn = useServerFn(listWatchedCompanies);
  const adminCheck = useServerFn(currentUserIsAdmin);
  const rankFn = useServerFn(autoRankForCurrentUser);
  const refreshFn = useServerFn(refreshWatchedNow);
  const saveFn = useServerFn(saveJobToMatches);

  const [q, setQ] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [source, setSource] = useState<string>("");
  const [showManage, setShowManage] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  const jobsQ = useQuery({
    queryKey: ["job-listings", q, remoteOnly, source],
    queryFn: () =>
      listJobsFn({
        data: {
          q: q || undefined,
          remoteOnly: remoteOnly || undefined,
          source: (source || undefined) as never,
          limit: 100,
        },
      }),
  });

  const watchedQ = useQuery({ queryKey: ["watched-companies"], queryFn: () => listWatchedFn() });
  const adminQ = useQuery({ queryKey: ["current-user-is-admin"], queryFn: () => adminCheck() });

  const rank = useMutation({
    mutationFn: () => rankFn(),
    onSuccess: (r) => setMsg(r.message),
    onError: (e) => setMsg(e instanceof Error ? e.message : "Rank failed"),
  });

  const refresh = useMutation({
    mutationFn: () => refreshFn(),
    onSuccess: (r) => {
      setMsg(`Refreshed: ${r.jobsUpserted} jobs across ${r.companiesOk}/${r.companiesTried} companies.`);
      qc.invalidateQueries({ queryKey: ["job-listings"] });
      qc.invalidateQueries({ queryKey: ["watched-companies"] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Refresh failed"),
  });

  const save = useMutation({
    mutationFn: (id: string) => saveFn({ data: { job_listing_id: id } }),
    onSuccess: (_r, id) => setSavedIds((s) => new Set(s).add(id)),
  });

  const jobs = jobsQ.data ?? [];

  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {jobs.length} shown
          </span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Discover</p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Live jobs from company career pages.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Pulled directly from public Greenhouse, Lever, Ashby, Remotive, RemoteOK, Jobicy,
            Arbeitnow, and The Muse feeds — no scraping, no bots. Save one to{" "}
            <strong>Matches</strong> to start tailoring.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search role, company, or city (e.g. Charlotte)…"
            className="w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All sources</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
            <option value="remotive">Remotive (remote)</option>
            <option value="remoteok">RemoteOK (remote)</option>
            <option value="jobicy">Jobicy (remote, US)</option>
            <option value="arbeitnow">Arbeitnow</option>
            <option value="themuse">The Muse (US metros)</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
            Remote only
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              onClick={() => setShowManage(true)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              Manage companies ({watchedQ.data?.length ?? "…"})
            </button>
            <button
              onClick={() => rank.mutate()}
              disabled={rank.isPending}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
              title="AI-rank the current pool against your resume; adds top 10 to Matches."
            >
              {rank.isPending ? "Ranking…" : "✨ Rank for me now"}
            </button>
            {adminQ.data?.isAdmin && (
              <button
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                title="Admin: re-fetch every watched company right now."
              >
                {refresh.isPending ? "Refreshing…" : "Refresh pool"}
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            {msg}
          </div>
        )}

        {jobsQ.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Pool is empty or nothing matches your filters. Admins can hit <strong>Refresh pool</strong>;
            the daily cron fills it automatically.
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} saved={savedIds.has(j.id)} onSave={() => save.mutate(j.id)} />
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          The daily refresh runs automatically. The weekly ranker adds your top 10 matches to{" "}
          <Link to="/apply/matches" className="underline">Matches</Link> every Monday. Nothing here
          submits an application — every link opens the real posting for you to review.
        </p>
      </div>

      {showManage && <ManageCompaniesDialog onClose={() => setShowManage(false)} />}
    </main>
  );
}

function JobRow({ job, saved, onSave }: { job: JobListing; saved: boolean; onSave: () => void }) {
  const posted = useMemo(() => {
    if (!job.posted_at) return null;
    const d = new Date(job.posted_at);
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (days < 1) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return d.toLocaleDateString();
  }, [job.posted_at]);
  return (
    <li className="flex items-start justify-between gap-4 p-4 hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <a href={job.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
            {job.role} <span className="text-muted-foreground">↗</span>
          </a>
          <span className="text-sm text-muted-foreground">· {job.company}</span>
          {job.remote && (
            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              Remote
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {job.location && <span>{job.location}</span>}
          {posted && <span>{posted}</span>}
          <span className="uppercase tracking-wider">{job.source}</span>
        </div>
        {job.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={saved}
        className={
          "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium " +
          (saved
            ? "border border-border bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:opacity-90")
        }
      >
        {saved ? "Saved ✓" : "Save to matches"}
      </button>
    </li>
  );
}

function ManageCompaniesDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listWatchedCompanies);
  const addFn = useServerFn(addWatchedCompany);
  const removeFn = useServerFn(removeWatchedCompany);
  const q = useQuery({ queryKey: ["watched-companies"], queryFn: () => listFn() });

  const [source, setSource] = useState<"greenhouse" | "lever" | "ashby">("greenhouse");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => addFn({ data: { source, slug: slug.trim(), company_name: name.trim() } }),
    onSuccess: () => {
      setSlug("");
      setName("");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["watched-companies"] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watched-companies"] }),
  });

  const rows = q.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Watched companies</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Add a company by its ATS slug — the identifier in its careers URL. Examples:{" "}
          <code>boards.greenhouse.io/<strong>stripe</strong></code>,{" "}
          <code>jobs.lever.co/<strong>netflix</strong></code>,{" "}
          <code>jobs.ashbyhq.com/<strong>openai</strong></code>. The daily refresh picks them up automatically.
        </p>

        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as never)}
            className="rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug (e.g. stripe)"
            className="rounded-md border border-input bg-background px-2 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            className="rounded-md border border-input bg-background px-2 py-2 text-sm"
          />
          <button
            onClick={() => add.mutate()}
            disabled={add.isPending || !slug || !name}
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {add.isPending ? "Adding…" : "Add"}
          </button>
        </div>
        {err && <p className="mb-2 text-sm text-destructive">{err}</p>}

        <ul className="divide-y divide-border rounded-md border border-border">
          {rows.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{w.company_name}</p>
                <p className="text-xs text-muted-foreground">
                  {w.source} · {w.slug}
                  {w.last_fetch_count !== null && ` · ${w.last_fetch_count} jobs`}
                  {w.last_fetch_status && w.last_fetch_status !== "ok" && (
                    <span className="text-destructive"> · {w.last_fetch_status.slice(0, 60)}</span>
                  )}
                </p>
              </div>
              {w.added_by ? (
                <button
                  onClick={() => remove.mutate(w.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">seeded</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
