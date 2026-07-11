import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

const Input = z.object({
  personName: z.string().min(1).max(120),
  company: z.string().min(1).max(120),
  role: z.string().max(160).optional().default(""),
  context: z.string().max(1000).optional().default(""),
});

export const generateReferralDm = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }): Promise<{ dm: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Write a warm, specific LinkedIn DM from Christopher Kendrick (AI Deployment / Enablement Manager, 10+ yrs enterprise onboarding, builds Claude + Lovable automations) to ${data.personName} at ${data.company}${data.role ? ` about the ${data.role} role` : ""}.

Rules:
- Under 700 characters.
- Open with a specific reason for reaching out to THIS person (not generic praise).
- One line on Christopher: "10+ yrs enterprise onboarding, shipping Claude + Lovable automations at Mews."
- Ask for a 15-min chat about the team, not a job. No hard ask for a referral in the first message.
- Sign off "— Chris".
${data.context ? `\nExtra context: ${data.context}` : ""}

Return ONLY the DM text. No preamble, no quotes.`;

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      prompt,
    });
    return { dm: text.trim() };
  });
