import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  addWatchedCompany,
  autoRankForCurrentUser,
  getMyFeedPrefs,
  setMyFeedPrefs,
  listJobListings,
  listWatchedCompanies,
  refreshWatchedNow,
  removeWatchedCompany,
  saveJobToMatches,
  AGGREGATE_FEEDS,
  type AggregateFeed,
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
  // Salary: annual USD; 0 = no filter. `onlyListed` opts into the narrow view.
  salaryMin: number;
  salaryOnlyListed: boolean;
  // Experience level; "" = no filter. `onlyClassified` requires an exact match.
  experienceLevel: string;
  levelOnlyClassified: boolean;
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
  salaryMin: 0,
  salaryOnlyListed: false,
  experienceLevel: "",
  levelOnlyClassified: false,
};

// NOTE: The classifier never assigns "mid" — it's the implicit default when no
// seniority marker is present, so filtering for "mid" would either match nothing
// (only-classified) or duplicate the include-unknown behavior of every other
// level. We omit it from the dropdown rather than ship a dead option.
const LEVEL_OPTIONS = [
  { value: "", label: "Any experience level" },
  { value: "intern", label: "Intern" },
  { value: "entry", label: "Entry / Junior" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Staff / Principal" },
  { value: "manager", label: "Manager" },
  { value: "director+", label: "Director / VP+" },
];


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
  // NOTE: `page` is reset synchronously in submit()/clear() below — resetting it
  // here in an effect caused a render where a new filter ran against a stale
  // non-zero offset, briefly showing "Nothing matches" before self-correcting.
  useEffect(() => {
    setMsg(null);
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
          salary_min: applied.salaryMin > 0 ? applied.salaryMin : undefined,
          salary_only_listed: applied.salaryOnlyListed || undefined,
          experience_level: (applied.experienceLevel || undefined) as never,
          level_only_classified: applied.levelOnlyClassified || undefined,
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
  const poolScope = jobsQ.data?.poolScope;
  const hasMore = (page + 1) * PAGE_SIZE < total;


  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(0);
    setApplied({ ...draft });
  };
  const clear = () => {
    setPage(0);
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
                title="Radius only applies once a US ZIP is entered above."
              />
              <span
                className="text-xs text-muted-foreground"
                title="Radius only applies once a US ZIP is entered above."
              >
                mi{!draft.zip ? " (enter ZIP to use)" : ""}
              </span>
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
              <option value="smartrecruiters">SmartRecruiters</option>
              <option value="remotive">Remotive (remote)</option>
              <option value="remoteok">RemoteOK (remote)</option>
              <option value="jobicy">Jobicy (remote, US)</option>
              <option value="arbeitnow">Arbeitnow</option>
              <option value="themuse">The Muse (US metros)</option>
              <option value="usajobs">USAJOBS (federal, US metros)</option>
            </select>

          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Min salary (USD/yr)</label>
              <input
                type="number"
                min={0}
                max={1_000_000}
                step={5000}
                value={draft.salaryMin || ""}
                onChange={(e) => setDraft({ ...draft, salaryMin: Number(e.target.value) || 0 })}
                placeholder="e.g. 150000"
                className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.salaryOnlyListed}
                onChange={(e) => setDraft({ ...draft, salaryOnlyListed: e.target.checked })}
              />
              Only show jobs with a listed salary
            </label>
            <select
              value={draft.experienceLevel}
              onChange={(e) => setDraft({ ...draft, experienceLevel: e.target.value })}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.levelOnlyClassified}
                onChange={(e) => setDraft({ ...draft, levelOnlyClassified: e.target.checked })}
                disabled={!draft.experienceLevel}
              />
              Exclude unclassified level
            </label>
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
            {draft.remoteOnly &&
              (draft.city || draft.region || draft.country || draft.zip) && (
                <span className="text-xs text-muted-foreground italic">
                  Location filters ignored — remote jobs match any location.
                </span>
              )}

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
          poolScope?.emptyPool ? (
            <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <p className="text-base font-medium text-foreground">Your Discover pool is empty.</p>
              <p className="mt-2">
                Add a few companies you want to watch, or enable at least one aggregate feed
                (Remotive, RemoteOK, Jobicy, Arbeitnow, The Muse). Both live behind{" "}
                <button
                  type="button"
                  onClick={() => setShowManage(true)}
                  className="font-medium text-primary hover:underline"
                >
                  Manage companies
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nothing in your pool matches. Try broadening filters, or add more companies via{" "}
              <button
                type="button"
                onClick={() => setShowManage(true)}
                className="font-medium text-primary hover:underline"
              >
                Manage companies
              </button>
              .
            </div>
          )
        ) : (

          <>
            {(applied.salaryMin > 0 || applied.experienceLevel) && (
              <CoverageNote
                rows={rows}
                salaryFilterActive={applied.salaryMin > 0}
                levelFilterActive={!!applied.experienceLevel}
                onlyListedSalary={applied.salaryOnlyListed}
                onlyClassifiedLevel={applied.levelOnlyClassified}
              />
            )}
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
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
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {job.location && <span>{job.location}</span>}
          {posted && <span>{posted}</span>}
          <span className="uppercase tracking-wider">{job.source}</span>
          {job.experience_level && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize">
              {job.experience_level}
            </span>
          )}
          {job.salary_max != null && (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {formatSalary(job)}
            </span>
          )}
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

const FEED_LABELS: Record<AggregateFeed, string> = {
  remotive: "Remotive (remote)",
  remoteok: "RemoteOK (remote)",
  jobicy: "Jobicy (remote, US)",
  arbeitnow: "Arbeitnow",
  themuse: "The Muse (US metros)",
};

function ManageCompaniesDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listWatchedCompanies);
  const addFn = useServerFn(addWatchedCompany);
  const removeFn = useServerFn(removeWatchedCompany);
  const getPrefsFn = useServerFn(getMyFeedPrefs);
  const setPrefsFn = useServerFn(setMyFeedPrefs);

  const q = useQuery({ queryKey: ["watched-companies"], queryFn: () => listFn() });
  const prefsQ = useQuery({ queryKey: ["feed-prefs"], queryFn: () => getPrefsFn() });

  const [source, setSource] = useState<"greenhouse" | "lever" | "ashby" | "smartrecruiters">("greenhouse");
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
      qc.invalidateQueries({ queryKey: ["job-listings"] });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watched-companies"] });
      qc.invalidateQueries({ queryKey: ["job-listings"] });
    },
  });
  const setPrefs = useMutation({
    mutationFn: (enabledFeeds: AggregateFeed[]) => setPrefsFn({ data: { enabledFeeds } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-prefs"] });
      qc.invalidateQueries({ queryKey: ["job-listings"] });
    },
  });

  const rows = q.data ?? [];
  const enabledFeeds = new Set<AggregateFeed>(prefsQ.data?.enabledFeeds ?? []);
  const toggleFeed = (f: AggregateFeed) => {
    const next = new Set(enabledFeeds);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    setPrefs.mutate(Array.from(next));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Discover pool</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <section className="mb-6">
          <h3 className="text-sm font-semibold">Aggregate feeds</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            General-board remote/US-metro sources. Enabled by default so you always have some
            postings even before you add companies.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {AGGREGATE_FEEDS.map((f) => (
              <label
                key={f}
                className="inline-flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={enabledFeeds.has(f)}
                  disabled={prefsQ.isLoading || setPrefs.isPending}
                  onChange={() => toggleFeed(f)}
                />
                {FEED_LABELS[f]}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold">Watched companies</h3>
          <p className="mt-1 mb-3 text-xs text-muted-foreground">
            Add a company by its ATS slug — the identifier in its careers URL. Examples:{" "}
            <code>boards.greenhouse.io/<strong>stripe</strong></code>,{" "}
            <code>jobs.lever.co/<strong>netflix</strong></code>,{" "}
            <code>jobs.ashbyhq.com/<strong>openai</strong></code>. The daily refresh picks them up automatically.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as never)}
              className="rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              <option value="greenhouse">Greenhouse</option>
              <option value="lever">Lever</option>
              <option value="ashby">Ashby</option>
              <option value="smartrecruiters">SmartRecruiters</option>
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

          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              You haven't added any companies yet. Add a few above — the daily refresh will
              pull their open roles into your Discover pool.
            </p>
          ) : (
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
                  <button
                    onClick={() => remove.mutate(w.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}


// Format annualized salary in the row's native currency. Because we store
// annualized numbers, the "/yr" is implied — we still show the original
// period as a caveat when it wasn't yearly at ingest.
function formatSalary(j: JobListing): string {
  if (j.salary_max == null) return "";
  const cur = j.salary_currency ?? "USD";
  const sym = cur === "EUR" ? "€" : cur === "GBP" ? "£" : "$";
  const fmt = (n: number) => (n >= 1000 ? `${sym}${Math.round(n / 1000)}k` : `${sym}${n}`);
  const range =
    j.salary_min != null && j.salary_min !== j.salary_max
      ? `${fmt(j.salary_min)}–${fmt(j.salary_max)}`
      : fmt(j.salary_max);
  const suffix = j.salary_period && j.salary_period !== "year" ? ` (${j.salary_period})` : "/yr";
  return `${range}${suffix}`;
}

// Honest count of how many rows on this page actually have data for the
// filters that are active, vs. how many are included-but-unlisted. The
// numbers are per-page, not global — but they immediately answer "is the
// filter finding anything or am I mostly looking at unlisted rows?".
function CoverageNote(props: {
  rows: JobListing[];
  salaryFilterActive: boolean;
  levelFilterActive: boolean;
  onlyListedSalary: boolean;
  onlyClassifiedLevel: boolean;
}) {
  const total = props.rows.length;
  if (total === 0) return null;
  const withSalary = props.rows.filter((r) => r.salary_max != null).length;
  const withLevel = props.rows.filter((r) => r.experience_level != null).length;
  const parts: string[] = [];
  if (props.salaryFilterActive) {
    parts.push(
      props.onlyListedSalary
        ? `${withSalary} with listed salary (unlisted excluded).`
        : `${withSalary} of ${total} on this page have a listed salary — the other ${total - withSalary} are included because their salary is unknown.`,
    );
  }
  if (props.levelFilterActive) {
    parts.push(
      props.onlyClassifiedLevel
        ? `${withLevel} with a classified experience level (unclassified excluded).`
        : `${withLevel} of ${total} on this page have a classified experience level — the other ${total - withLevel} are included because their level is unknown.`,
    );
  }
  if (parts.length === 0) return null;
  return (
    <div className="mt-8 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {parts.join(" ")}
    </div>
  );
}

