import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

export type RewriteEntitlement = {
  plan: "free" | "pro" | "founder";
  used: boolean;
  allowed: boolean;
  reason: "ok" | "free_plan" | "already_used" | "founder_unlimited";
};

async function loadEntitlement(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
): Promise<RewriteEntitlement> {
  const { data } = await supabase
    .from("profiles")
    .select("plan, free_resume_rewrite_used")
    .eq("id", userId)
    .maybeSingle();
  const planRaw = (data?.plan as string | null) ?? "free";
  const plan = (planRaw === "pro" || planRaw === "founder" ? planRaw : "free") as
    | "free"
    | "pro"
    | "founder";
  const used = !!data?.free_resume_rewrite_used;
  if (plan === "founder") return { plan, used, allowed: true, reason: "founder_unlimited" };
  if (plan === "free") return { plan, used, allowed: false, reason: "free_plan" };
  if (used) return { plan, used, allowed: false, reason: "already_used" };
  return { plan, used, allowed: true, reason: "ok" };
}

export const getRewriteEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RewriteEntitlement> => {
    return loadEntitlement(context.supabase, context.userId);
  });

const SYSTEM = `You are an elite resume editor. Comprehensively rewrite the user's whole resume:
- Stronger action verbs, tighter phrasing, consistent professional tone.
- Better-quantified impact where numbers already exist — never invent metrics.
- NEVER fabricate employers, titles, dates, degrees, certifications, or accomplishments.
- Preserve every job entry, its company, title, dates, and location exactly. Same or similar bullet count per role.
- Keep contact fields (name, email, phone, location, github, linkedin) unchanged.
- Return ONLY valid JSON matching the exact input schema. No markdown, no commentary.`;

export const generateResumeRewrite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ resume: MasterResume; sourceId: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const ent = await loadEntitlement(context.supabase, context.userId);
    if (!ent.allowed) {
      if (ent.reason === "free_plan") {
        throw new Error("Resume rewrite is a Pro feature. Upgrade to unlock.");
      }
      throw new Error(
        "You've already used your included rewrite for this plan. Additional rewrites are a paid add-on.",
      );
    }

    const { data: row, error } = await context.supabase
      .from("resumes")
      .select("id, data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("No primary resume found. Add one on the Resume page first.");
    const master = row.data as unknown as MasterResume;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Rewrite the following resume JSON. Return the SAME JSON shape and keys, with rewritten string values. Preserve arrays' structure and length where noted.

INPUT RESUME JSON:
${JSON.stringify(master, null, 2)}

Rules recap:
- Keep name, email, phone, location, github, linkedin, education, certifications, dates, company, title, location values UNCHANGED.
- Rewrite: summary, competencies (may reword), each experience[].bullets, additionalExperience items, proficiencies[].value, projects[].outcome.
- Keep the same number of bullets per experience entry.
- Return ONLY the JSON object.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
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
      if (!m) throw new Error("AI did not return valid JSON. Try again.");
      parsed = JSON.parse(m[0]);
    }

    // Result produced successfully — mark the one-time entitlement as used now.
    // (Saving is a separate step; the AI credit is what we're gating.)
    await context.supabase
      .from("profiles")
      .update({ free_resume_rewrite_used: true })
      .eq("id", context.userId);

    return { resume: parsed, sourceId: row.id };
  });

export const saveRewrittenResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { resume: unknown; mode: "overwrite" | "new"; name?: string }) =>
    z
      .object({
        resume: z.record(z.string(), z.unknown()),
        mode: z.enum(["overwrite", "new"]),
        name: z.string().min(1).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.mode === "overwrite") {
      const { data: existing } = await context.supabase
        .from("resumes")
        .select("id")
        .eq("user_id", context.userId)
        .eq("is_primary", true)
        .maybeSingle();
      if (!existing) throw new Error("No primary resume to overwrite.");
      const { error } = await context.supabase
        .from("resumes")
        .update({ data: data.resume as never, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .eq("user_id", context.userId);
      if (error) throw error;
      return { ok: true, id: existing.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("resumes")
      .insert({
        user_id: context.userId,
        data: data.resume as never,
        name: data.name || "Rewritten resume",
        is_primary: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: inserted.id };
  });
