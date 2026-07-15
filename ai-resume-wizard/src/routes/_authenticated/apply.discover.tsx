import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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

const PAGE_SIZE = 50;

type Filters = {
  role: string;
  company: string;
  city: string;
  region: string;
  country: string;
  zip: string;
  radius: number;
  remoteOnly: boolean;
  source: string;
};

const EMPTY: Filters = {
  role: "",
  company: "",
  city: "",
  region: "",
  country: "",
  zip: "",
  radius: 25,
  remoteOnly: false,
  source: "",
};

function DiscoverPage() {
  const qc = useQueryClient();
  const listJobsFn = useServerFn(listJobListings);
  const listWatchedFn = useServerFn(listWatchedCompanies);
  const adminCheck = useServerFn(currentUserIsAdmin);
  const rankFn = useServerFn(autoRankForCurrentUser);
  const refreshFn = useServerFn(refreshWatchedNow);
  const saveFn = useServerFn(saveJobToMatches);

  // Draft (typed) vs applied (used in the query). Search only runs on submit
  // so a partial typed string doesn't produce a page of garbage matches.
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(0);

  const [showManage, setShowManage] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  // Reset the stale confirmation banner whenever the applied filters change
  // so a "Refreshed X jobs" message doesn't hang around next to new results.
  useEffect(() => {
    setMsg(null);
    setPage(0);
  }, [applied]);

  const jobsQ = useQuery({
    queryKey: ["job-listings", applied, page],
    queryFn: () =>
      listJobsFn({
        data: {
          role: applied.role || undefined,
          company: applied.company || undefined,
          city: applied.city || undefined,
          region: applied.region || undefined,
          country: applied.country || undefined,
          zip: applied.zip || undefined,
          radius_miles: applied.zip ? applied.radius : undefined,
          remoteOnly: applied.remoteOnly || undefined,
          source: (applied.source || undefined) as never,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
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
      const per = Object.entries(r.perSource ?? {})
        .map(([src, s]) => `${src}: ${s.jobs} (${s.ok} ok, ${s.failed} failed)`)
        .join(" · ");
      setMsg(
        `Refreshed: ${r.jobsUpserted} jobs across ${r.companiesOk}/${r.companiesTried} sources.` +
          (per ? ` — ${per}` : ""),
      );
      qc.invalidateQueries({ queryKey: ["job-listings"] });
      qc.invalidateQueries({ queryKey: ["watched-companies"] });
    },
    onError: (e) => setMsg(e instanceof Error ? e.message : "Refresh failed"),
  });

  const save = useMutation({
    mutationFn: (id: string) => saveFn({ data: { job_listing_id: id } }),
    onSuccess: (_r, id) => setSavedIds((s) => new Set(s).add(id)),
  });

  const rows = jobsQ.data?.rows ?? [];
  const total = jobsQ.data?.total ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < total;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setApplied({ ...draft });
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
  };

  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {rows.length} of {total.toLocaleString()} shown
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

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              placeholder="Role (e.g. Product Manager)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={draft.company}
              onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              placeholder="Company"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
              placeholder="City (e.g. Charlotte)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
              placeholder="State (e.g. NC)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
              placeholder="Country (e.g. US, UK)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              value={draft.zip}
              onChange={(e) => setDraft({ ...draft, zip: e.target.value })}
              placeholder="ZIP (US only)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              inputMode="numeric"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Radius</label>
              <input
                type="number"
                min={0}
                max={500}
                value={draft.radius}
                onChange={(e) => setDraft({ ...draft, radius: Number(e.target.value) || 0 })}
                className="w-20 rounded-md border border-input bg-background px-2 py-2 text-sm"
                disabled={!draft.zip}
              />
              <span className="text-xs text-muted-foreground">mi</span>
            </div>
            <select
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value })}
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
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.remoteOnly}
                onChange={(e) => setDraft({ ...draft, remoteOnly: e.target.checked })}
              />
              Remote only
            </label>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
            >
              Clear
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowManage(true)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
              >
                Manage companies ({watchedQ.data?.length ?? "…"})
              </button>
              <button
                type="button"
                onClick={() => rank.mutate()}
                disabled={rank.isPending}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                title="AI-rank the current pool against your resume; adds top 10 to Matches."
              >
                {rank.isPending ? "Ranking…" : "✨ Rank for me now"}
              </button>
              {adminQ.data?.isAdmin && (
                <button
                  type="button"
                  onClick={() => refresh.mutate()}
                  disabled={refresh.isPending}
                  className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
                  title="Admin: re-fetch every watched company right now (parallelized)."
                >
                  {refresh.isPending ? "Refreshing…" : "Refresh pool"}
                </button>
              )}
            </div>
          </div>
        </form>

        {msg && (
          <div className="mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            {msg}
          </div>
        )}

        {jobsQ.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing matches. Try broadening filters or ask an admin to hit <strong>Refresh pool</strong>.
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
              {rows.map((j) => (
                <JobRow key={j.id} job={j} saved={savedIds.has(j.id)} onSave={() => save.mutate(j.id)} />
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40"
                >
                  ← Previous
                </button>
                <button
                  disabled={!hasMore}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Location filters use structured city/state/country parsed from each feed; older rows fall
          back to free-text matching until the next refresh. ZIP-radius search is US-only and works
          offline. The daily refresh runs automatically. The weekly ranker adds your top 10 matches
          to <Link to="/apply/matches" className="underline">Matches</Link> every Monday.
        </p>
      </div>

      {showManage && <ManageCompaniesDialog onClose={() => setShowManage(false)} />}
    </main>
  );
}

function JobRow({ job, saved, onSave }: { job: JobListing; saved: boolean; onSave: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const posted = useMemo(() => {
    if (!job.posted_at) return null;
    const d = new Date(job.posted_at);
    const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (days < 1) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    return d.toLocaleDateString();
  }, [job.posted_at]);
  // Only offer "Show more" when the text is actually long enough to be
  // clamped — otherwise the toggle is noise.
  const canExpand = !!job.description && job.description.length > 180;
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
          <>
            <p
              className={
                "mt-2 whitespace-pre-line text-sm text-muted-foreground " +
                (expanded ? "" : "line-clamp-2")
              }
            >
              {job.description}
            </p>
            {canExpand && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </>
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
