// Server functions for the job-discovery feature.
// - listJobListings: paged browse of the shared pool
// - listWatchedCompanies / addWatchedCompany / removeWatchedCompany
// - saveJobToMatches: one-click "save this listing to my personal matches"
// - refreshWatchedNow: manual on-demand fetch (same logic as the cron)
// - autoRankForCurrentUser: manual on-demand run of the weekly ranker

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

export type JobListing = {
  id: string;
  source: string;
  source_id: string;
  company: string;
  role: string;
  location: string | null;
  url: string;
  description: string | null;
  remote: boolean;
  posted_at: string | null;
  fetched_at: string;
};

export type WatchedCompany = {
  id: string;
  source: string;
  slug: string;
  company_name: string;
  added_by: string | null;
  last_fetched_at: string | null;
  last_fetch_status: string | null;
  last_fetch_count: number | null;
};

const KNOWN_SOURCES = ["greenhouse", "lever", "ashby", "remotive", "remoteok", "jobicy", "arbeitnow", "themuse"] as const;

export const listJobListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().max(200).optional(),
        remoteOnly: z.boolean().optional(),
        source: z.enum(KNOWN_SOURCES).optional(),
        limit: z.number().int().min(1).max(200).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<JobListing[]> => {
    let q = context.supabase
      .from("job_listings")
      .select("*")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(data.limit ?? 100);
    if (data.remoteOnly) q = q.eq("remote", true);
    if (data.source) q = q.eq("source", data.source);
    if (data.q && data.q.trim()) {
      const like = `%${data.q.trim()}%`;
      q = q.or(`role.ilike.${like},company.ilike.${like}`);
    }
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as JobListing[];
  });

export const listWatchedCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WatchedCompany[]> => {
    const { data, error } = await context.supabase
      .from("watched_companies")
      .select("*")
      .order("company_name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as WatchedCompany[];
  });

export const addWatchedCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        source: z.enum(KNOWN_SOURCES),
        slug: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, "letters/numbers/dash/underscore only"),
        company_name: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<WatchedCompany> => {
    const { data: row, error } = await context.supabase
      .from("watched_companies")
      .insert({
        source: data.source,
        slug: data.slug,
        company_name: data.company_name,
        added_by: context.userId,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return row as WatchedCompany;
  });

export const removeWatchedCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // RLS enforces that only rows the user added can be deleted
    const { error } = await context.supabase.from("watched_companies").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const saveJobToMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ job_listing_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: job, error: jerr } = await context.supabase
      .from("job_listings")
      .select("*")
      .eq("id", data.job_listing_id)
      .maybeSingle();
    if (jerr) throw jerr;
    if (!job) throw new Error("Job listing not found");
    const j = job as JobListing;

    const { data: existing } = await context.supabase
      .from("personal_matches")
      .select("id")
      .eq("user_id", context.userId)
      .eq("job_listing_id", j.id)
      .maybeSingle();
    if (existing) return { id: (existing as { id: string }).id, alreadySaved: true };

    const { data: row, error } = await context.supabase
      .from("personal_matches")
      .insert({
        user_id: context.userId,
        company: j.company,
        role: j.role,
        location: j.location,
        role_url: j.url,
        notes: null,
        job_listing_id: j.id,
        source: "discover",
        status: "saved",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id, alreadySaved: false };
  });

export const updateMatchStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["saved", "interested", "applied", "passed"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("personal_matches")
      .update({ status: data.status } as never)
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// -----------------------------------------------------------------------------
// On-demand refresh (same code path as the daily cron, callable from the UI).
// Runs as the admin — we already require admin for this UI action.

export const refreshWatchedNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin-gate: only admins can trigger a full pool refresh from the UI.
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin" as never)
      .maybeSingle();
    if (!role) throw new Error("Only admins can trigger a global refresh.");

    const { runRefreshJobs } = await import("./jobs.refresh.server");
    return runRefreshJobs();
  });

export const autoRankForCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { rankJobsForUser } = await import("./jobs.rank.server");
    const { data: resumeRow } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    const resume = resumeRow?.data as unknown as MasterResume | undefined;
    if (!resume) throw new Error("Save a primary resume first.");

    return rankJobsForUser({ supabase: context.supabase, userId: context.userId, resume });
  });
