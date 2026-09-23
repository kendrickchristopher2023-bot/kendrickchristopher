import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";
import { enforceUsage } from "./usage";

export type { MasterResume } from "./resume-data";

export type ResumeMeta = {
  id: string;
  name: string | null;
  is_primary: boolean;
  updated_at: string;
};

async function markOnboardedIfNeeded(userId: string) {
  // Server-side only: `onboarded_at` UPDATE is revoked from the authenticated role.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // First completion wins — never overwrite an existing timestamp.
  await supabaseAdmin
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId)
    .is("onboarded_at", null);
}

export const listMyResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResumeMeta[]> => {
    const { data, error } = await context.supabase
      .from("resumes")
      .select("id, name, is_primary, updated_at")
      .eq("user_id", context.userId)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ResumeMeta[];
  });

export const getMyResume = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { id?: string }) =>
    z.object({ id: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ resume: MasterResume | null; id: string | null; name: string | null }> => {
      const q = context.supabase
        .from("resumes")
        .select("id, data, name")
        .eq("user_id", context.userId);
      const { data: row, error } = data.id
        ? await q.eq("id", data.id).maybeSingle()
        : await q.eq("is_primary", true).maybeSingle();
      if (error) throw error;
      if (!row) return { resume: null, id: null, name: null };
      return { resume: row.data as unknown as MasterResume, id: row.id, name: row.name ?? null };
    },
  );

export const saveMyResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resume: unknown; id?: string; name?: string }) =>
    z
      .object({
        resume: z.record(z.string(), z.unknown()),
        id: z.string().uuid().optional(),
        name: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const patch: { data: never; updated_at: string; name?: string | null } = {
        data: data.resume as never,
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) patch.name = data.name || null;
      const { error } = await context.supabase
        .from("resumes")
        .update(patch)
        .eq("id", data.id)
        .eq("user_id", context.userId);
      if (error) throw error;
      return { ok: true, id: data.id };
    }

    // Legacy behavior: create/update primary when no id
    const { data: existing } = await context.supabase
      .from("resumes")
      .select("id")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("resumes")
        .update({ data: data.resume as never, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return { ok: true, id: existing.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("resumes")
      .insert({
        user_id: context.userId,
        data: data.resume as never,
        is_primary: true,
        name: data.name || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await markOnboardedIfNeeded(context.userId);

    return { ok: true, id: inserted.id };
  });

export const createNamedResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; cloneFromPrimary?: boolean; resume?: unknown }) =>
    z
      .object({
        name: z.string().min(1).max(120),
        cloneFromPrimary: z.boolean().optional().default(false),
        resume: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let payload = data.resume as Record<string, unknown> | undefined;
    if (!payload && data.cloneFromPrimary) {
      const { data: prim } = await context.supabase
        .from("resumes")
        .select("data")
        .eq("user_id", context.userId)
        .eq("is_primary", true)
        .maybeSingle();
      payload = (prim?.data as Record<string, unknown> | undefined) ?? {};
    }
    const { data: inserted, error } = await context.supabase
      .from("resumes")
      .insert({
        user_id: context.userId,
        data: (payload ?? {}) as never,
        name: data.name,
        is_primary: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    await markOnboardedIfNeeded(context.userId);
    return { ok: true, id: inserted.id };
  });

export const renameResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) =>
    z.object({ id: z.string().uuid(), name: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("resumes")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setPrimaryResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    // Drop existing primary first (partial unique index would block otherwise).
    await context.supabase
      .from("resumes")
      .update({ is_primary: false })
      .eq("user_id", context.userId)
      .eq("is_primary", true);
    const { error } = await context.supabase
      .from("resumes")
      .update({ is_primary: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("resumes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

const EXTRACT_SYSTEM = `You are a resume parser. Extract the user's resume from raw text (resume paste, LinkedIn "About", etc.) into strict JSON. Never invent employers, dates, or metrics — leave fields empty ("" or []) if unknown. Return ONLY valid JSON, no markdown, no commentary.`;

export const extractResumeFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) =>
    z.object({ text: z.string().min(30).max(30000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ resume: MasterResume }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");
    await enforceUsage(context.supabase, context.userId, "parse_resume");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Extract the following resume text into this exact JSON schema. If a field is unknown, use "" for strings or [] for arrays. Do NOT invent content.

Schema:
{
  "name": "string",
  "title": "string (current or target job title)",
  "email": "string",
  "phone": "string",
  "location": "string",
  "github": "string (host+path, no protocol) or ''",
  "linkedin": "string (host+path, no protocol) or ''",
  "summary": "string (2-4 sentences)",
  "competencies": ["string", "..."],
  "experience": [
    { "title": "string", "company": "string", "location": "string", "dates": "string", "bullets": ["string", "..."] }
  ],
  "additionalExperience": ["string", "..."],
  "proficiencies": [{ "label": "string", "value": "string" }],
  "education": { "degree": "string", "school": "string" },
  "certifications": ["string", "..."],
  "projects": [{ "title": "string", "stack": "string", "outcome": "string", "href": "string?" }],
  "lastUpdated": "${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}"
}

RESUME TEXT:
${data.text}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: EXTRACT_SYSTEM,
      prompt,
    });

    const cleaned = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");
    let parsed: MasterResume;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI did not return valid JSON. Try pasting more detail.");
      parsed = JSON.parse(m[0]);
    }
    return { resume: parsed };
  });

export type UsageSnapshot = {
  plan: "free" | "pro" | "founder";
  window: "month" | "day";
  day: string;
  counts: Record<string, number>;
};

export const getMyUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsageSnapshot> => {
    const { computeEffectivePlan, PLAN_WINDOW } = await import("./usage");
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("plan, plan_expires_at")
      .eq("id", context.userId)
      .maybeSingle();
    const plan = computeEffectivePlan(
      prof?.plan as string | null,
      (prof as { plan_expires_at?: string | null } | null)?.plan_expires_at ?? null,
    );
    const window = PLAN_WINDOW[plan];

    const today = new Date().toISOString().slice(0, 10);
    // Free runs on a calendar-month allowance, pro/founder on a daily guard.
    const from = window === "month" ? `${today.slice(0, 7)}-01` : today;

    const { data: rows } = await context.supabase
      .from("usage_daily")
      .select("*")
      .eq("user_id", context.userId)
      .gte("day", from)
      .lte("day", today);

    const sum = (key: string) =>
      (rows ?? []).reduce(
        (acc: number, r: Record<string, unknown>) => acc + ((r[key] as number) ?? 0),
        0,
      );

    return {
      plan,
      window,
      day: today,
      counts: {
        tailor: sum("tailor_count"),
        cover_letter: sum("cover_letter_count"),
        interview_prep: sum("interview_prep_count"),
        linkedin: sum("linkedin_count"),
        referral_dm: sum("referral_dm_count"),
        parse_resume: sum("parse_resume_count"),
        chat: sum("chat_count"),
      },
    };
  });
