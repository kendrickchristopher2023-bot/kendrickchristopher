import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  createNamedResume,
  deleteResume,
  listMyResumes,
  renameResume,
  setPrimaryResume,
} from "@/lib/resume.functions";
import { ResumeTabs } from "@/components/ResumeTabs";

export const Route = createFileRoute("/_authenticated/resumes")({
  head: () => ({
    meta: [
      { title: "My Resumes — AI Job Kit" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResumesPage,
});

function ResumesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyResumes);
  const createFn = useServerFn(createNamedResume);
  const setPrimFn = useServerFn(setPrimaryResume);
  const delFn = useServerFn(deleteResume);
  const renameFn = useServerFn(renameResume);
  const q = useQuery({ queryKey: ["my-resumes"], queryFn: () => listFn() });

  const [name, setName] = useState("");
  const [clone, setClone] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["my-resumes"] });

  const create = useMutation({
    mutationFn: () => createFn({ data: { name, cloneFromPrimary: clone } }),
    onSuccess: () => { setName(""); invalidate(); },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const setPrim = useMutation({
    mutationFn: (id: string) => setPrimFn({ data: { id } }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    mutationFn: (v: { id: string; name: string }) => renameFn({ data: v }),
    onSuccess: () => { setEditingId(null); setEditName(""); invalidate(); },
  });

  return (
    <main className="min-h-screen bg-background px-6 py-12" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-3xl">
        <ResumeTabs />
        <h1 className="text-3xl font-bold tracking-tight">Resume tracks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep multiple named master resumes (e.g. "AI-focused", "Product management"). The
          primary one is used by default for tailoring and export.
        </p>

        <section className="mt-8 rounded-lg border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Add a resume track</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              placeholder="Track name (e.g. AI/ML lead)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[220px] rounded border border-input bg-background px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={clone} onChange={(e) => setClone(e.target.checked)} />
              Clone from primary
            </label>
            <button
              onClick={() => create.mutate()}
              disabled={!name.trim() || create.isPending}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        </section>

        <section className="mt-6 rounded-lg border border-border bg-card">
          {q.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No resumes yet. Add your first from /resume.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(q.data ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    {editingId === r.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editName.trim()) rename.mutate({ id: r.id, name: editName.trim() });
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 min-w-0 rounded border border-input bg-background px-2 py-1 text-sm"
                        />
                        <button type="submit" disabled={rename.isPending} className="text-xs text-primary hover:underline">
                          Save
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <p className="font-medium">
                        {r.name || <span className="text-muted-foreground italic">Unnamed</span>}
                        {r.is_primary && (
                          <span className="ml-2 rounded bg-primary/10 text-primary border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold">
                            PRIMARY
                          </span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(r.updated_at).toLocaleString()}
                    </p>
                  </div>
                  {editingId !== r.id && (
                    <button
                      onClick={() => { setEditingId(r.id); setEditName(r.name ?? ""); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Rename
                    </button>
                  )}
                  {!r.is_primary && (
                    <button
                      onClick={() => setPrim.mutate(r.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Set primary
                    </button>
                  )}
                  <a
                    href={`/resume?id=${r.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    View
                  </a>

                  {!r.is_primary && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${r.name ?? "Unnamed"}"? This can't be undone.`)) del.mutate(r.id);
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
