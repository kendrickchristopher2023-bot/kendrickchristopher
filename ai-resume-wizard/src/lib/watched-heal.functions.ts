// Admin actions for the watched-companies self-healer:
//   - applyWatchedSuggestion: verify a suggested slug returns jobs (name-sanity
//     included), then remap all watcher rows for that (source,slug) pair.
//   - removeWatchedCompany: admin-scoped delete for a quarantined entry across
//     all watchers.
//   - reenableWatchedCompany: flip active back on and reset the failure counter.
//
// All actions verify admin role via user_roles (RLS-safe check via context.supabase)
// before touching supabaseAdmin. Every action logs to admin_audit_log.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: unknown; userId: string }): Promise<void> {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

async function auditLog(adminId: string, action: string, details: Record<string, unknown>): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as unknown as {
      from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
    })
      .from("admin_audit_log")
      .insert({ admin_user_id: adminId, action, details });
  } catch {
    /* audit failure never blocks the action */
  }
}

const applySchema = z.object({
  currentSource: z.string().min(1),
  currentSlug: z.string().min(1),
  newSource: z.enum(["greenhouse", "lever", "ashby", "smartrecruiters"]),
  newSlug: z.string().min(1).max(120),
});

export const applyWatchedSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof applySchema>) => applySchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find all watcher rows for the current (source,slug).
    const { data: rows, error } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ data: Array<{ id: string; company_name: string }> | null; error: { message: string } | null }> };
        };
      };
    })
      .from("watched_companies")
      .select("id, company_name")
      .eq("source", data.currentSource)
      .eq("slug", data.currentSlug);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("No watchers found for that source/slug");

    // Verify the new (source,slug) actually returns jobs and the name matches
    // — never trust an admin click blindly; the same-slug guard still applies.
    const { fetchOne } = await import("./job-sources.server");
    const { _internal } = await import("./watched-heal.server");
    const companyName = rows[0].company_name;
    let jobs: Awaited<ReturnType<typeof fetchOne>> = [];
    try {
      jobs = await fetchOne(data.newSource, data.newSlug, companyName);
    } catch (e) {
      throw new Error(`Verify failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (jobs.length === 0) throw new Error("That slug returns no jobs — not applying.");
    // Loose name check against the first job's source_slug (adapter overwrites `company`).
    const identity = jobs[0]?.source_slug ?? data.newSlug;
    if (!_internal.nameMatches(companyName, identity)) {
      throw new Error(`Slug returned jobs but company identity "${identity}" doesn't look like "${companyName}".`);
    }

    const ids = rows.map((r) => r.id);
    const { error: upErr } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        update: (v: unknown) => { in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }> };
      };
    })
      .from("watched_companies")
      .update({
        source: data.newSource,
        slug: data.newSlug,
        active: true,
        consecutive_failures: 0,
        disabled_at: null,
        auto_healed_at: new Date().toISOString(),
        auto_heal_from: `${data.currentSource}/${data.currentSlug} (admin-applied)`,
        suggestions: [],
        last_fetch_status: `admin-remapped from ${data.currentSource}/${data.currentSlug}`,
      })
      .in("id", ids);
    if (upErr) throw new Error(upErr.message);

    await auditLog(context.userId, "watched.admin_applied_suggestion", {
      from_source: data.currentSource,
      from_slug: data.currentSlug,
      to_source: data.newSource,
      to_slug: data.newSlug,
      watchers: ids.length,
      jobs_preview: jobs.length,
    });
    return { ok: true, watchers: ids.length, jobs_preview: jobs.length };
  });

const scopeSchema = z.object({
  source: z.string().min(1),
  slug: z.string().min(1),
});

export const removeWatchedCompanyAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof scopeSchema>) => scopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (c: string, v: string) => { eq: (c: string, v: string) => { select: (s: string) => Promise<{ data: Array<{ id: string }> | null; error: { message: string } | null }> } };
        };
      };
    })
      .from("watched_companies")
      .delete()
      .eq("source", data.source)
      .eq("slug", data.slug)
      .select("id");
    if (error) throw new Error(error.message);
    const removed = rows?.length ?? 0;
    await auditLog(context.userId, "watched.admin_removed", { source: data.source, slug: data.slug, watchers: removed });
    return { ok: true, removed };
  });

export const reenableWatchedCompanyAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof scopeSchema>) => scopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as unknown as {
      from: (t: string) => {
        update: (v: unknown) => {
          eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        };
      };
    })
      .from("watched_companies")
      .update({ active: true, consecutive_failures: 0, disabled_at: null })
      .eq("source", data.source)
      .eq("slug", data.slug);
    if (error) throw new Error(error.message);
    await auditLog(context.userId, "watched.admin_reenabled", { source: data.source, slug: data.slug });
    return { ok: true };
  });
