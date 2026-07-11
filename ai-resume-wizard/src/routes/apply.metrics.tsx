import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/apply/metrics")({
  head: () => ({
    meta: [
      { title: "Funnel Metrics — Application Kit" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "description", content: "Job hunt funnel tracker." },
    ],
  }),
  component: MetricsPage,
});

type Stage = "applied" | "response" | "screen" | "onsite" | "offer" | "rejected";
type Source = "cold" | "referral" | "recruiter";

type Application = {
  id: string;
  company: string;
  role: string;
  jdUrl?: string;
  appliedAt: string; // ISO date
  source: Source;
  stage: Stage;
  notes?: string;
};

const STORAGE_KEY = "kendrick.applications.v1";

function load(): Application[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function save(apps: Application[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

const STAGE_ORDER: Stage[] = ["applied", "response", "screen", "onsite", "offer"];
const STAGE_LABEL: Record<Stage, string> = {
  applied: "Applied",
  response: "Response",
  screen: "Screen",
  onsite: "Onsite",
  offer: "Offer",
  rejected: "Rejected",
};

function stageIndex(s: Stage): number {
  if (s === "rejected") return -1;
  return STAGE_ORDER.indexOf(s);
}

function toCsv(apps: Application[]): string {
  const header = ["company", "role", "jdUrl", "appliedAt", "source", "stage", "notes"];
  const rows = apps.map((a) =>
    header.map((h) => JSON.stringify((a as any)[h] ?? "")).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function MetricsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [form, setForm] = useState({
    company: "",
    role: "",
    jdUrl: "",
    source: "cold" as Source,
    stage: "applied" as Stage,
    notes: "",
  });

  useEffect(() => {
    setApps(load());
    // Try to prefill from last tailor session
    try {
      const raw = localStorage.getItem("kendrick.tailor.history.v1");
      if (raw) {
        const hist = JSON.parse(raw);
        const last = Array.isArray(hist) ? hist[0] : null;
        if (last?.company) {
          setForm((f) => ({ ...f, company: last.company, role: last.role ?? "" }));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Application[]) => {
    setApps(next);
    save(next);
  };

  const addApp = () => {
    if (!form.company.trim()) return;
    const app: Application = {
      id: crypto.randomUUID(),
      company: form.company.trim(),
      role: form.role.trim(),
      jdUrl: form.jdUrl.trim() || undefined,
      appliedAt: new Date().toISOString().slice(0, 10),
      source: form.source,
      stage: form.stage,
      notes: form.notes.trim() || undefined,
    };
    persist([app, ...apps]);
    setForm({ company: "", role: "", jdUrl: "", source: "cold", stage: "applied", notes: "" });
  };

  const updateStage = (id: string, stage: Stage) => {
    persist(apps.map((a) => (a.id === id ? { ...a, stage } : a)));
  };
  const remove = (id: string) => {
    if (!confirm("Delete this application?")) return;
    persist(apps.filter((a) => a.id !== id));
  };

  const funnel = useMemo(() => {
    const counts: Record<Stage, number> = { applied: 0, response: 0, screen: 0, onsite: 0, offer: 0, rejected: 0 };
    for (const a of apps) {
      // count each app at every stage it has reached
      const idx = stageIndex(a.stage);
      if (a.stage === "rejected") {
        counts.rejected++;
        counts.applied++;
      } else {
        for (let i = 0; i <= idx; i++) counts[STAGE_ORDER[i]]++;
      }
    }
    return counts;
  }, [apps]);

  const bySource = useMemo(() => {
    const src: Record<Source, { total: number; screens: number; offers: number }> = {
      cold: { total: 0, screens: 0, offers: 0 },
      referral: { total: 0, screens: 0, offers: 0 },
      recruiter: { total: 0, screens: 0, offers: 0 },
    };
    for (const a of apps) {
      src[a.source].total++;
      if (stageIndex(a.stage) >= stageIndex("screen")) src[a.source].screens++;
      if (a.stage === "offer") src[a.source].offers++;
    }
    return src;
  }, [apps]);

  const weeklyPace = useMemo(() => {
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    return apps.filter((a) => now - new Date(a.appliedAt).getTime() < week).length;
  }, [apps]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(apps)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `application-funnel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxFunnel = Math.max(funnel.applied, 1);

  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <Link to="/apply" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back to Application Kit
        </Link>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Metrics</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Funnel Tracker
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Log every application. In 2 weeks you'll know which channel is actually
            producing screens — then double down. Data stays on this device.
          </p>
        </header>

        {/* Funnel */}
        <section className="mt-10 rounded-lg border border-border bg-card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-foreground">Funnel</h2>
            <p className="text-xs text-muted-foreground">
              This week: <span className="font-semibold text-foreground">{weeklyPace}</span> / target 10
            </p>
          </div>
          <div className="mt-5 space-y-2">
            {STAGE_ORDER.map((s, i) => {
              const count = funnel[s];
              const pct = (count / maxFunnel) * 100;
              const prev = i === 0 ? count : funnel[STAGE_ORDER[i - 1]];
              const conv = prev > 0 && i > 0 ? Math.round((count / prev) * 100) : null;
              return (
                <div key={s}>
                  <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{STAGE_LABEL[s]}</span>
                    <span>
                      {count}{conv !== null && <span className="ml-2 text-primary">{conv}% conv</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-3 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {funnel.rejected > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              Rejected/closed: {funnel.rejected}
            </p>
          )}
        </section>

        {/* By source */}
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">By source</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            {(Object.keys(bySource) as Source[]).map((s) => {
              const d = bySource[s];
              const screenRate = d.total ? Math.round((d.screens / d.total) * 100) : 0;
              return (
                <div key={s} className="rounded border border-border p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{d.total}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="text-primary">{screenRate}%</span> → screen
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Log form */}
        <section className="mt-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Log application</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              placeholder="JD URL (optional)"
              value={form.jdUrl}
              onChange={(e) => setForm({ ...form, jdUrl: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as Source })}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="cold">Cold apply</option>
              <option value="referral">Referral</option>
              <option value="recruiter">Recruiter inbound</option>
            </select>
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
              className="rounded border border-input bg-background px-3 py-2 text-sm"
            >
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>{STAGE_LABEL[s]}</option>
              ))}
              <option value="rejected">Rejected</option>
            </select>
            <textarea
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded border border-input bg-background px-3 py-2 text-sm sm:col-span-2"
              rows={2}
            />
          </div>
          <button
            onClick={addApp}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add
          </button>
        </section>

        {/* Table */}
        <section className="mt-6 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-lg font-semibold text-foreground">All applications ({apps.length})</h2>
            <button onClick={exportCsv} className="text-xs font-medium text-primary hover:underline">
              Export CSV
            </button>
          </div>
          {apps.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing logged yet. Add your first above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Stage</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apps.map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2 text-muted-foreground">{a.appliedAt}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{a.company}</td>
                      <td className="px-3 py-2 text-foreground">{a.role}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.source}</td>
                      <td className="px-3 py-2">
                        <select
                          value={a.stage}
                          onChange={(e) => updateStage(a.id, e.target.value as Stage)}
                          className="rounded border border-input bg-background px-2 py-1 text-xs"
                        >
                          {STAGE_ORDER.map((s) => (
                            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                          ))}
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => remove(a.id)} className="text-xs text-muted-foreground hover:text-destructive">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Data stored in this browser's localStorage. Export to CSV regularly if you switch devices.
        </p>
      </div>
    </main>
  );
}
