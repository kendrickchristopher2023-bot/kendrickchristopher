import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  addMatch,
  deleteMatch,
  listMatches,
  nearbyZipCodes,
  suggestMatches,
  updateMatch,
  type PersonalMatch,
  type Suggestion,
} from "@/lib/matches.functions";
import {
  listApplications,
  listTailorSessions,
  upsertApplication,
  type Application,
  type TailorSessionSummary,
} from "@/lib/applications.functions";
import { batchTailorResume } from "@/lib/tailor.functions";
import { draftFollowup, listFollowupsDue, type FollowupCandidate } from "@/lib/followup.functions";


export const Route = createFileRoute("/_authenticated/apply/matches")({
  head: () => ({
    meta: [
      { title: "Job Matches — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: MatchesPage,
});

function normalize(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function MatchesPage() {
  const qc = useQueryClient();
  const listMatchesFn = useServerFn(listMatches);
  const listAppsFn = useServerFn(listApplications);
  const listSessionsFn = useServerFn(listTailorSessions);

  const matchesQ = useQuery({ queryKey: ["matches"], queryFn: () => listMatchesFn() });
  const appsQ = useQuery({ queryKey: ["applications"], queryFn: () => listAppsFn() });
  const sessionsQ = useQuery({ queryKey: ["tailor-sessions"], queryFn: () => listSessionsFn() });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [markApplyFor, setMarkApplyFor] = useState<PersonalMatch | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["matches"] });
    qc.invalidateQueries({ queryKey: ["applications"] });
    qc.invalidateQueries({ queryKey: ["tailor-sessions"] });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allMatches = matchesQ.data ?? [];
  const apps = appsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];

  // -------- Location filters --------
  const [fCity, setFCity] = useState("");
  const [fState, setFState] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fZip, setFZip] = useState("");
  const [fRadius, setFRadius] = useState(25);
  const [fRemoteOnly, setFRemoteOnly] = useState(false);
  const nearbyFn = useServerFn(nearbyZipCodes);
  const zipQ = useQuery({
    queryKey: ["nearby-zips", fZip.trim(), fRadius],
    queryFn: () => nearbyFn({ data: { zip: fZip.trim(), radius_miles: fRadius } }),
    enabled: fZip.trim().length >= 3 && fRadius > 0,
    staleTime: 60 * 60 * 1000,
  });
  const nearbySet = useMemo(
    () => (zipQ.data ? new Set(zipQ.data.zips) : null),
    [zipQ.data],
  );

  const matches = useMemo(() => {
    const c = fCity.trim().toLowerCase();
    const st = fState.trim().toLowerCase();
    const co = fCountry.trim().toLowerCase();
    return allMatches.filter((m) => {
      if (fRemoteOnly) {
        const loc = (m.location ?? "").toLowerCase();
        const notes = (m.notes ?? "").toLowerCase();
        if (!/\bremote\b/.test(loc) && !/\bremote\b/.test(notes)) return false;
      }
      if (c && (m.city ?? "").toLowerCase() !== c) return false;
      if (st && (m.state ?? "").toLowerCase() !== st) return false;
      if (co && (m.country ?? "").toLowerCase() !== co) return false;
      if (nearbySet) {
        const z = (m.zip_code ?? "").trim();
        if (!z || !nearbySet.has(z)) return false;
      }
      return true;
    });
  }, [allMatches, fCity, fState, fCountry, nearbySet, fRemoteOnly]);
  const anyFilter =
    !!fCity.trim() || !!fState.trim() || !!fCountry.trim() || !!fZip.trim() || fRemoteOnly;

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {matches.length} target{matches.length === 1 ? "" : "s"}
          </span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Job Matches
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Your target companies.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Track roles you're targeting, tailor your resume in batches, and log which ones
            you've applied to. Every "apply" link opens the real posting — you review and
            submit yourself.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            + Add match
          </button>
          <button
            onClick={() => setShowSuggest(true)}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            ✨ AI suggest
          </button>
          <button
            onClick={() => setShowBatch(true)}
            disabled={selected.size === 0}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Tailor selected ({selected.size})
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Filter by location
            </p>
            {anyFilter && (
              <button
                onClick={() => {
                  setFCity("");
                  setFState("");
                  setFCountry("");
                  setFZip("");
                  setFRemoteOnly(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            )}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fRemoteOnly}
              onChange={(e) => setFRemoteOnly(e.target.checked)}
            />
            <span>Remote only</span>
            <span className="text-xs text-muted-foreground">(matches with "remote" in location/notes)</span>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input
              value={fCity}
              onChange={(e) => setFCity(e.target.value)}
              placeholder="City"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
            <input
              value={fState}
              onChange={(e) => setFState(e.target.value)}
              placeholder="State"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
            <input
              value={fCountry}
              onChange={(e) => setFCountry(e.target.value)}
              placeholder="Country"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
            <input
              value={fZip}
              onChange={(e) => setFZip(e.target.value)}
              placeholder="ZIP (US)"
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={500}
                value={fRadius}
                onChange={(e) => setFRadius(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-muted-foreground">mi</span>
            </div>
          </div>
          {fZip.trim().length >= 3 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {zipQ.isLoading
                ? "Looking up ZIP radius…"
                : zipQ.data && zipQ.data.zips.length === 0
                  ? "No US ZIPs found in radius (dataset is US-only)."
                  : zipQ.data
                    ? `${zipQ.data.zips.length} ZIPs within ${fRadius} miles.`
                    : ""}
            </p>
          )}
          {anyFilter && (
            <p className="mt-1 text-xs text-muted-foreground">
              Showing {matches.length} of {allMatches.length} matches.
            </p>
          )}
        </div>

        {matchesQ.isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : matches.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {anyFilter
              ? "No matches fit these filters. Clear filters or add more targets."
              : "No targets yet. Add one manually or use AI suggest."}
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-3 w-8"></th>
                  <th className="px-3 py-3 font-semibold">Company</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold hidden sm:table-cell">Location</th>
                  <th className="px-3 py-3 font-semibold hidden md:table-cell">Readiness</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matches.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    checked={selected.has(m.id)}
                    onToggle={() => toggle(m.id)}
                    sessions={sessions}
                    apps={apps}
                    onEditSaved={invalidateAll}
                    onDeleted={invalidateAll}
                    onMarkApplied={() => setMarkApplyFor(m)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <FollowupsSection />

        <p className="mt-4 text-xs text-muted-foreground">
          Nothing here auto-submits an application. Links open the company's real posting; you
          review and submit yourself.
        </p>
      </div>


      {showAdd && <AddMatchDialog onClose={() => setShowAdd(false)} onSaved={invalidateAll} />}
      {showSuggest && <SuggestDialog onClose={() => setShowSuggest(false)} onAdded={invalidateAll} />}
      {showBatch && (
        <BatchTailorDialog
          selectedMatches={matches.filter((m) => selected.has(m.id))}
          onClose={() => setShowBatch(false)}
          onDone={() => {
            setShowBatch(false);
            setSelected(new Set());
            invalidateAll();
          }}
        />
      )}
      {markApplyFor && (
        <MarkAppliedDialog
          match={markApplyFor}
          onClose={() => setMarkApplyFor(null)}
          onSaved={() => {
            setMarkApplyFor(null);
            invalidateAll();
          }}
        />
      )}
    </main>
  );
}

function MatchRow({
  match,
  checked,
  onToggle,
  sessions,
  apps,
  onEditSaved,
  onDeleted,
  onMarkApplied,
}: {
  match: PersonalMatch;
  checked: boolean;
  onToggle: () => void;
  sessions: TailorSessionSummary[];
  apps: Application[];
  onEditSaved: () => void;
  onDeleted: () => void;
  onMarkApplied: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const deleteFn = useServerFn(deleteMatch);
  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id: match.id } }),
    onSuccess: onDeleted,
  });

  const readiness = useMemo(() => {
    const c = normalize(match.company);
    const r = normalize(match.role);
    const relatedSessions = sessions.filter((s) => normalize(s.company) === c);
    const tailored = relatedSessions.length > 0;
    const hasLetter = relatedSessions.some((s) => s.has_cover_letter);
    const hasReferral = relatedSessions.some((s) => s.has_referral_dm);
    const app = apps.find((a) => normalize(a.company) === c && normalize(a.role) === r);
    return { tailored, hasLetter, hasReferral, applied: !!app, stage: app?.stage };
  }, [match, sessions, apps]);

  return (
    <>
      <tr className="hover:bg-muted/30">
        <td className="px-3 py-3">
          <input type="checkbox" checked={checked} onChange={onToggle} />
        </td>
        <td className="px-3 py-3 font-medium">{match.company}</td>
        <td className="px-3 py-3">
          {match.role_url ? (
            <a href={match.role_url} target="_blank" rel="noreferrer" className="hover:underline">
              {match.role} <span className="text-muted-foreground">↗</span>
            </a>
          ) : (
            match.role
          )}
          {match.tier && (
            <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {match.tier}
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground hidden sm:table-cell">
          {match.location || "—"}
        </td>
        <td className="px-3 py-3 hidden md:table-cell">
          <div className="flex flex-wrap gap-1">
            <Chip on={readiness.tailored} label="Tailored" />
            <Chip on={readiness.hasLetter} label="Letter" />
            <Chip on={readiness.hasReferral} label="Referral" />
            <Chip on={readiness.applied} label={readiness.applied ? `Applied·${readiness.stage}` : "Applied"} />
          </div>
        </td>
        <td className="px-3 py-3 text-right whitespace-nowrap">
          <Link
            to="/apply/tailor"
            className="text-xs font-medium text-primary hover:underline"
          >
            Tailor
          </Link>
          <button onClick={onMarkApplied} className="ml-3 text-xs text-primary hover:underline">
            Mark applied
          </button>
          <button onClick={() => setEditing(true)} className="ml-3 text-xs text-muted-foreground hover:text-foreground">
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${match.company} / ${match.role}?`)) del.mutate();
            }}
            className="ml-3 text-xs text-destructive hover:underline"
          >
            Delete
          </button>
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={6} className="bg-muted/20 p-4">
            <EditMatchInline
              match={match}
              onSaved={() => {
                setEditing(false);
                onEditSaved();
              }}
              onCancel={() => setEditing(false)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function Chip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
        on
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
          : "bg-muted text-muted-foreground border-border"
      }`}
    >
      {on ? "✓" : "○"} {label}
    </span>
  );
}

function AddMatchDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const addFn = useServerFn(addMatch);
  const [form, setForm] = useState({
    company: "",
    role: "",
    location: "",
    tier: "",
    role_url: "",
    notes: "",
    zip_code: "",
    city: "",
    state: "",
    country: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => addFn({ data: form as never }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <Modal onClose={onClose} title="Add match">
      <div className="space-y-3">
        <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
        <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
        <Field label="Location (free-text, for display)" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Field label="ZIP" value={form.zip_code} onChange={(v) => setForm({ ...form, zip_code: v })} />
          <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
        </div>
        <Field label="Tier (A/B/C)" value={form.tier} onChange={(v) => setForm({ ...form, tier: v })} />
        <Field label="Role URL" value={form.role_url} onChange={(v) => setForm({ ...form, role_url: v })} />
        <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending || !form.company || !form.role}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {m.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditMatchInline({
  match,
  onSaved,
  onCancel,
}: {
  match: PersonalMatch;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const updateFn = useServerFn(updateMatch);
  const [form, setForm] = useState({
    company: match.company,
    role: match.role,
    location: match.location ?? "",
    tier: match.tier ?? "",
    role_url: match.role_url ?? "",
    notes: match.notes ?? "",
    zip_code: match.zip_code ?? "",
    city: match.city ?? "",
    state: match.state ?? "",
    country: match.country ?? "",
  });
  const m = useMutation({
    mutationFn: () => updateFn({ data: { id: match.id, ...form } as never }),
    onSuccess: onSaved,
  });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
      <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
      <Field label="Location (display)" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
      <Field label="Tier" value={form.tier} onChange={(v) => setForm({ ...form, tier: v })} />
      <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
      <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
      <Field label="ZIP" value={form.zip_code} onChange={(v) => setForm({ ...form, zip_code: v })} />
      <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
      <Field label="Role URL" value={form.role_url} onChange={(v) => setForm({ ...form, role_url: v })} />
      <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-input px-3 py-1.5 text-sm">Cancel</button>
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {m.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function SuggestDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const suggestFn = useServerFn(suggestMatches);
  const addFn = useServerFn(addMatch);
  const [prompt, setPrompt] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [country, setCountry] = useState("");
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(25);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [addedIdx, setAddedIdx] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const gen = useMutation({
    mutationFn: () =>
      suggestFn({
        data: {
          prompt,
          city: city.trim() || undefined,
          state: stateVal.trim() || undefined,
          country: country.trim() || undefined,
          zip_code: zip.trim() || undefined,
          radius_miles: zip.trim() ? radius : undefined,
        },
      }),
    onSuccess: (r) => {
      setSuggestions(r.suggestions);
      setAddedIdx(new Set());
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });

  const addOne = async (idx: number, s: Suggestion) => {
    await addFn({
      data: {
        company: s.company,
        role: s.role,
        location: s.location || null,
        role_url: s.careers_url || null,
        notes: s.why || null,
        city: city.trim() || null,
        state: stateVal.trim() || null,
        country: country.trim() || null,
        zip_code: zip.trim() || null,
      } as never,
    });
    setAddedIdx((prev) => new Set(prev).add(idx));
    onAdded();
  };

  const canSubmit =
    prompt.trim().length >= 3 || !!city.trim() || !!stateVal.trim() || !!country.trim() || !!zip.trim();

  return (
    <Modal onClose={onClose} title="AI suggest targets" wide>
      <p className="text-sm text-muted-foreground mb-3">
        Describe industries, seniority, and/or fill any location fields. AI reads your resume and
        proposes matches. Nothing is added until you click <strong>Add</strong>.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Series B–C AI startups, forward-deployed or solutions roles"
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
      />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <input value={stateVal} onChange={(e) => setStateVal(e.target.value)} placeholder="State"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP (US)"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
        <div className="flex items-center gap-1">
          <input type="number" min={0} max={500} value={radius}
            onChange={(e) => setRadius(Number(e.target.value) || 0)}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
          <span className="text-xs text-muted-foreground">mi</span>
        </div>
      </div>
      <button
        onClick={() => gen.mutate()}
        disabled={gen.isPending || !canSubmit}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {gen.isPending ? "Thinking…" : "Suggest"}
      </button>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      {suggestions.length > 0 && (
        <ul className="mt-5 space-y-2 max-h-96 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i} className="rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {s.company} — <span className="text-muted-foreground">{s.role}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{s.location}</p>
                  <p className="mt-1 text-xs">{s.why}</p>
                  {s.careers_url && (
                    <a href={s.careers_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      {s.careers_url}
                    </a>
                  )}
                </div>
                <button
                  disabled={addedIdx.has(i)}
                  onClick={() => addOne(i, s)}
                  className="shrink-0 rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                >
                  {addedIdx.has(i) ? "Added ✓" : "Add"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function BatchTailorDialog({
  selectedMatches,
  onClose,
  onDone,
}: {
  selectedMatches: PersonalMatch[];
  onClose: () => void;
  onDone: () => void;
}) {
  const batchFn = useServerFn(batchTailorResume);
  const [jds, setJds] = useState<Record<string, string>>(() =>
    Object.fromEntries(selectedMatches.map((m) => [m.id, ""])),
  );
  const [results, setResults] = useState<
    Array<{ match_id?: string; company: string; role: string; session_id?: string; matchScore?: number; error?: string }>
  >([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    const items = selectedMatches
      .map((m) => ({
        match_id: m.id,
        company: m.company,
        role: m.role,
        jobDescription: (jds[m.id] ?? "").trim(),
      }))
      .filter((i) => i.jobDescription.length >= 30);
    if (items.length === 0) return;
    setRunning(true);
    try {
      const r = await batchFn({ data: { items } });
      setResults(r.results);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`Batch tailor (${selectedMatches.length})`} wide>
      <p className="text-sm text-muted-foreground mb-3">
        Paste the job description for each role. Results save to your tailor history — open each
        individually after.
      </p>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {selectedMatches.map((m) => {
          const r = results.find((x) => x.match_id === m.id);
          return (
            <div key={m.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">
                {m.company} — <span className="text-muted-foreground">{m.role}</span>
              </p>
              <textarea
                value={jds[m.id] ?? ""}
                onChange={(e) => setJds({ ...jds, [m.id]: e.target.value })}
                placeholder="Paste job description…"
                rows={4}
                className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1 text-xs font-mono"
              />
              {r && (
                <p className={`mt-2 text-xs ${r.error ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {r.error ? `Failed: ${r.error}` : `Done — match ${r.matchScore}/100`}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm">
          Close
        </button>
        {results.length > 0 ? (
          <button
            onClick={onDone}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Done
          </button>
        ) : (
          <button
            onClick={run}
            disabled={running}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {running ? "Tailoring…" : "Tailor all"}
          </button>
        )}
      </div>
    </Modal>
  );
}

function MarkAppliedDialog({
  match,
  onClose,
  onSaved,
}: {
  match: PersonalMatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertFn = useServerFn(upsertApplication);
  const [stage, setStage] = useState<
    "applied" | "response" | "screen" | "onsite" | "offer" | "rejected" | "withdrawn"
  >("applied");
  const [source, setSource] = useState<"cold" | "referral" | "recruiter" | "event" | "other">("cold");
  const [jdUrl, setJdUrl] = useState(match.role_url ?? "");
  const [notes, setNotes] = useState("");
  const m = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          company: match.company,
          role: match.role,
          stage,
          source,
          jd_url: jdUrl || null,
          notes: notes || null,
        } as never,
      }),
    onSuccess: onSaved,
  });
  return (
    <Modal onClose={onClose} title={`Log application — ${match.company}`}>
      <p className="text-sm text-muted-foreground mb-3">
        This only records what you did. It doesn't submit anything to the company.
      </p>
      <div className="space-y-3">
        <label className="block text-sm">
          Stage
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as typeof stage)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {["applied", "response", "screen", "onsite", "offer", "rejected", "withdrawn"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Source
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {["cold", "referral", "recruiter", "event", "other"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <Field label="Job posting URL" value={jdUrl} onChange={setJdUrl} />
        <Field label="Notes" value={notes} onChange={setNotes} textarea />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-input px-4 py-2 text-sm">Cancel</button>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {m.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}

function Modal({
  onClose,
  title,
  children,
  wide,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`bg-card border border-border rounded-lg p-6 w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FollowupsSection() {
  const listFn = useServerFn(listFollowupsDue);
  const q = useQuery({ queryKey: ["followups-due"], queryFn: () => listFn() });
  const [drafting, setDrafting] = useState<FollowupCandidate | null>(null);

  if (q.isLoading || !q.data || q.data.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Follow-ups due</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Applied 7+ days ago and still marked "applied". Draft a nudge — you copy and send it
        yourself.
      </p>
      <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
        {q.data.map((f) => (
          <li key={f.application_id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium">
                {f.company} — <span className="text-muted-foreground">{f.role}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Applied {f.days_since} days ago
              </p>
            </div>
            <button
              onClick={() => setDrafting(f)}
              className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
            >
              Draft follow-up
            </button>
          </li>
        ))}
      </ul>
      {drafting && <FollowupDraftDialog candidate={drafting} onClose={() => setDrafting(null)} />}
    </section>
  );
}

function FollowupDraftDialog({
  candidate,
  onClose,
}: {
  candidate: FollowupCandidate;
  onClose: () => void;
}) {
  const draftFn = useServerFn(draftFollowup);
  const [kind, setKind] = useState<"status_check" | "thank_you" | "nudge">("status_check");
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState(candidate.notes ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const gen = useMutation({
    mutationFn: () =>
      draftFn({
        data: {
          application_id: candidate.application_id,
          company: candidate.company,
          role: candidate.role,
          days_since: candidate.days_since,
          kind,
          recipient_name: recipient,
          notes,
        },
      }),
    onSuccess: (r) => {
      setSubject(r.subject);
      setBody(r.body);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
  };

  return (
    <Modal onClose={onClose} title={`Follow-up — ${candidate.company}`} wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="status_check">Status check</option>
            <option value="nudge">Gentle nudge</option>
            <option value="thank_you">Thank-you</option>
          </select>
        </label>
        <Field label="Recipient name (optional)" value={recipient} onChange={setRecipient} />
      </div>
      <div className="mt-3">
        <Field label="Notes / anything to reference" value={notes} onChange={setNotes} textarea />
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      <button
        onClick={() => gen.mutate()}
        disabled={gen.isPending}
        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {gen.isPending ? "Drafting…" : subject ? "Regenerate" : "Draft"}
      </button>
      {subject && (
        <div className="mt-5 rounded-lg border border-border bg-background p-4">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full font-semibold bg-transparent border-0 focus:outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="mt-2 w-full rounded border border-input bg-background px-2 py-1 text-sm"
          />
          <div className="mt-2 flex justify-end">
            <button onClick={copy} className="text-xs text-primary hover:underline">
              Copy subject + body
            </button>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        This only drafts text. You send it yourself.
      </p>
    </Modal>
  );
}
