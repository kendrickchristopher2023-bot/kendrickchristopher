import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MasterResume } from "./resume-data";

export type ScreenerQA = { q: string; a: string };

const STANDARD_QUESTIONS = [
  "Why {{Company}}?",
  "Why are you leaving your current role?",
  "Salary expectations",
  "Are you authorized to work in the United States?",
  "Willing to relocate?",
  "Notice period?",
  "Preferred start date?",
  "Tell us about a time you shipped something meaningful",
  "How do you translate technical capabilities to non-technical stakeholders?",
  "Describe a time you handled ambiguity",
  "Why should we hire you over other candidates?",
  "What are your greatest strengths and one area you're actively improving?",
];

const SYSTEM = `You draft honest, first-person answers to standard job-application screener questions. Rules:
- Ground every answer in the candidate's actual resume — do not fabricate employers, metrics, or experiences.
- Keep answers 3–6 sentences. Concrete, professional, human.
- Answers MUST be self-contained and submittable as-is with NO placeholders. Write around the employer's name using natural phrasing like "your team", "this role", "the company", or "your organization".
- The ONLY exception: a question that is fundamentally meaningless without naming the employer (e.g. "Why do you want to work at this company?"). For those — and ONLY those — put the literal token {{Company}} in the answer as a deliberate stop sign the candidate must customize per-application. Never use {{Company}} as filler in answers about salary, notice period, relocation, leaving reasons, strengths, or behavioral stories — those work fine without naming anyone.
- In the returned "q" field, preserve the literal token {{Company}} exactly as it appears in the input question.
- Return ONLY valid JSON: { "answers": [ { "q": "...", "a": "..." } ] } in the same order as the questions given.`;

export const generateScreenerAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ extraContext: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ answers: ScreenerQA[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { data: row, error } = await context.supabase
      .from("resumes")
      .select("data")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("No resume on file. Set one up on /resume first.");
    const resume = row.data as unknown as MasterResume;

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const resumeSnippet = JSON.stringify({
      name: resume.name,
      title: resume.title,
      location: resume.location,
      summary: resume.summary,
      experience: (resume.experience ?? []).map((e) => ({
        title: e.title, company: e.company, dates: e.dates, bullets: e.bullets,
      })),
      certifications: resume.certifications,
    });

    const prompt = `CANDIDATE RESUME (JSON):
${resumeSnippet}

${data.extraContext ? `EXTRA CONTEXT FROM CANDIDATE:\n${data.extraContext}\n\n` : ""}QUESTIONS (answer in this exact order):
${STANDARD_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Return JSON: { "answers": [ { "q": "<question text>", "a": "<answer>" } ] }`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM,
      prompt,
    });
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    let parsed: { answers: ScreenerQA[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI did not return valid JSON.");
      parsed = JSON.parse(m[0]);
    }
    const answers = parsed.answers ?? [];
    // Persist so the browser-extension endpoint (and future devices) can read them.
    await context.supabase
      .from("profiles")
      .update({ screener_answers: answers as never })
      .eq("id", context.userId);
    return { answers };
  });

export const getMyScreenerAnswers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ answers: ScreenerQA[] }> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("screener_answers")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { answers: (data?.screener_answers as ScreenerQA[] | null) ?? [] };
  });
