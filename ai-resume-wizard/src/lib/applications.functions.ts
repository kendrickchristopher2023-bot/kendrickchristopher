import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ApplicationStage =
  | "applied" | "response" | "screen" | "onsite" | "offer" | "rejected" | "withdrawn";

export type Application = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  applied_at: string;
  jd_url: string | null;
  notes: string | null;
  source: "cold" | "referral" | "recruiter" | "event" | "other";
  tailor_session_id: string | null;
  response_at: string | null;
  created_at: string;
  updated_at: string;
};

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Application[]> => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("*")
      .eq("user_id", context.userId)
      .order("applied_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Application[];
  });

export const upsertApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      company: z.string().min(1).max(200),
      role: z.string().min(1).max(200),
      stage: z.enum(["applied", "response", "screen", "onsite", "offer", "rejected", "withdrawn"]).default("applied"),
      jd_url: z.string().url().optional().nullable().or(z.literal("")),
      notes: z.string().max(4000).optional().nullable(),
      source: z.enum(["cold", "referral", "recruiter", "event", "other"]).default("cold"),
      tailor_session_id: z.string().uuid().optional().nullable(),
      applied_at: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }): Promise<Application> => {
    const payload = {
      user_id: context.userId,
      company: data.company,
      role: data.role,
      stage: data.stage,
      jd_url: data.jd_url || null,
      notes: data.notes || null,
      source: data.source,
      tailor_session_id: data.tailor_session_id || null,
      applied_at: data.applied_at || new Date().toISOString(),
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("applications")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select("*")
        .single();
      if (error) throw error;
      return row as Application;
    }

    // True upsert on (user_id, lower(company), lower(role)).
    // Look up existing case-insensitively; update if found, otherwise insert.
    const { data: existing, error: findErr } = await context.supabase
      .from("applications")
      .select("id")
      .eq("user_id", context.userId)
      .ilike("company", data.company.trim())
      .ilike("role", data.role.trim())
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing?.id) {
      const { data: row, error } = await context.supabase
        .from("applications")
        .update({
          stage: payload.stage,
          jd_url: payload.jd_url,
          notes: payload.notes,
          source: payload.source,
          applied_at: payload.applied_at,
        })
        .eq("id", existing.id)
        .eq("user_id", context.userId)
        .select("*")
        .single();
      if (error) throw error;
      return row as Application;
    }

    const { data: row, error } = await context.supabase
      .from("applications")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      // Race: another concurrent insert won. Fall back to update.
      if ((error as { code?: string }).code === "23505") {
        const { data: dupe } = await context.supabase
          .from("applications")
          .select("id")
          .eq("user_id", context.userId)
          .ilike("company", data.company.trim())
          .ilike("role", data.role.trim())
          .maybeSingle();
        if (dupe?.id) {
          const { data: updated, error: updErr } = await context.supabase
            .from("applications")
            .update({
              stage: payload.stage,
              jd_url: payload.jd_url,
              notes: payload.notes,
              source: payload.source,
              applied_at: payload.applied_at,
            })
            .eq("id", dupe.id)
            .eq("user_id", context.userId)
            .select("*")
            .single();
          if (updErr) throw updErr;
          return updated as Application;
        }
      }
      throw error;
    }
    return row as Application;
  });

export type TailorSessionSummary = {
  id: string;
  company: string | null;
  role: string | null;
  created_at: string;
  has_cover_letter: boolean;
  has_referral_dm: boolean;
  match_score: number | null;
};

export const listTailorSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TailorSessionSummary[]> => {
    const { data, error } = await context.supabase
      .from("tailor_sessions")
      .select("id, company, role, created_at, cover_letter, referral_dm, tailored_resume")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => {
      const t = r.tailored_resume as { matchScore?: number } | null;
      return {
        id: r.id,
        company: r.company,
        role: r.role,
        created_at: r.created_at,
        has_cover_letter: !!r.cover_letter,
        has_referral_dm: !!r.referral_dm,
        match_score: t?.matchScore ?? null,
      };
    });
  });
