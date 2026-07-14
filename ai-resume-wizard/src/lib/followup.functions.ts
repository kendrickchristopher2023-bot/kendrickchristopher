import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

export type FollowupCandidate = {
  application_id: string;
  company: string;
  role: string;
  applied_at: string;
  days_since: number;
  jd_url: string | null;
  notes: string | null;
};

/**
 * Applications where stage='applied' and applied_at >= 7 days ago.
 * Nothing here sends anything — used to surface a "draft follow-up" affordance.
 */
export const listFollowupsDue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FollowupCandidate[]> => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("id, company, role, stage, applied_at, jd_url, notes")
      .eq("user_id", context.userId)
      .eq("stage", "applied")
      .order("applied_at", { ascending: true });
    if (error) throw error;
    const now = Date.now();
    const week = 7 * 24 * 3600 * 1000;
    return (data ?? [])
      .filter((r) => r.applied_at && now - new Date(r.applied_at).getTime() >= week)
      .map((r) => ({
        application_id: r.id,
        company: r.company,
        role: r.role,
        applied_at: r.applied_at as string,
        days_since: Math.floor((now - new Date(r.applied_at as string).getTime()) / 86400000),
        jd_url: r.jd_url,
        notes: r.notes,
      }));
  });

const DraftInput = z.object({
  application_id: z.string().uuid().optional(),
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  days_since: z.number().int().min(0).max(365).default(7),
  kind: z.enum(["status_check", "thank_you", "nudge"]).default("status_check"),
  recipient_name: z.string().max(200).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
});

export const draftFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => DraftInput.parse(raw))
  .handler(async ({ data, context }): Promise<{ subject: string; body: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { data: row } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    const resume = row?.data as unknown as MasterResume | undefined;
    const senderName = resume?.name ?? "";

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Write a ${data.kind} follow-up email for the ${data.role} role at ${data.company}.
Recipient: ${data.recipient_name || "(unknown — use 'Hi team,')"}
Days since applying: ${data.days_since}
Extra context: ${data.notes || "(none)"}
Sender: ${senderName || "(no name)"}

Rules:
- Under 150 words.
- Warm, specific, no filler.
- One clear next-step ask.
- No fabrication about status, hiring, or timeline.
- Return exactly:
Subject: ...
Body:
...`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      prompt,
    });

    // Parse "Subject: ...\nBody:\n..."
    const raw = text.trim();
    const subjMatch = raw.match(/^Subject:\s*(.+?)\s*\n/i);
    const bodyMatch = raw.match(/Body:\s*([\s\S]+)$/i);
    return {
      subject: subjMatch?.[1]?.trim() ?? `Following up on ${data.role} at ${data.company}`,
      body: bodyMatch?.[1]?.trim() ?? raw,
    };
  });
