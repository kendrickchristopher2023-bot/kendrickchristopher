import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(200).optional().default(""),
});

const NOTIFY_TO = "kendrickchristopher@hotmail.com";
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

const hits = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return false;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendNotification(data: { name: string; email: string; message: string }) {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY not set, skipping email notification");
    return;
  }
  const from = process.env["CONTACT_FROM_EMAIL"] || "Portfolio <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [NOTIFY_TO],
      reply_to: data.email,
      subject: `New portfolio contact from ${data.name}`,
      html: `<h2>New portfolio contact</h2>
<p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
<p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
<p><strong>Message:</strong></p>
<p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[contact] Resend request failed [${response.status}]: ${body}`);
  }
}

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    // Honeypot: silently drop bot submissions.
    if (data.website.trim() !== "") return { ok: true as const };

    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequest().headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return { ok: false as const, reason: "rate_limited" as const };
    }

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const payload = { name: data.name, email: data.email, message: data.message };
    const { error } = await supabase.from("contact_submissions").insert(payload);
    if (error) {
      console.error("[contact] insert failed", error.message);
      return { ok: false as const, reason: "save_failed" as const };
    }

    // Email is best effort: never fail the submission because of it.
    try {
      await sendNotification(payload);
    } catch (emailError) {
      console.error("[contact] email notification failed", emailError);
    }

    return { ok: true as const };
  });
