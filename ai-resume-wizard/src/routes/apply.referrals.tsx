import { createFileRoute, Link, useServerFn } from "@tanstack/react-router";
import { useState } from "react";
import { generateReferralDm } from "@/lib/referral.functions";

export const Route = createFileRoute("/apply/referrals")({
  head: () => ({
    meta: [
      { title: "Referral DM Generator — Christopher Kendrick" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const gen = useServerFn(generateReferralDm);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [ctx, setCtx] = useState("");
  const [dm, setDm] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onGen = async () => {
    setErr(null);
    setDm("");
    if (!name || !company) {
      setErr("Name and company are required.");
      return;
    }
    setLoading(true);
    try {
      const r = await gen({ data: { personName: name, company, role, context: ctx } });
      setDm(r.dm);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    await navigator.clipboard.writeText(dm);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Referral DM
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Warm intros beat cold apps 10:1.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Give a name and a company. Get a personalized LinkedIn DM asking for a
            15-minute chat — not a hard referral ask.
          </p>
        </header>

        <section className="mt-8 space-y-3">
          <input
            type="text"
            placeholder="Their name (e.g. Jane Doe)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Company (e.g. Anthropic)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Role you're interested in (optional)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Anything specific about them (recent post, background)? Optional."
            value={ctx}
            onChange={(e) => setCtx(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onGen}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Drafting…" : "Draft DM"}
          </button>
          {err && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {err}
            </p>
          )}
        </section>

        {dm && (
          <div className="mt-8 rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Draft DM · edit before sending
              </p>
              <button onClick={onCopy} className="text-xs font-medium text-primary hover:underline">
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <textarea
              value={dm}
              onChange={(e) => setDm(e.target.value)}
              rows={10}
              className="w-full resize-y bg-transparent px-4 py-4 text-sm leading-relaxed text-foreground focus:outline-none"
            />
          </div>
        )}
      </div>
    </main>
  );
}
