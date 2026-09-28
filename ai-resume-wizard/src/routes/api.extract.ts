// POST /api/extract — file upload extraction.
// Accepts multipart/form-data with:
//   - file:  the uploaded file (PDF/DOCX/PNG/JPEG/WEBP, <=10MB)
//   - mode:  "resume" (default) → returns { text, resume } structured MasterResume
//            "text"   → returns { text } only (used by chat attachments)
// Bearer-auth via the signed-in user's Supabase session. Enforces the
// existing `parse_resume` daily cap. The raw file bytes are never persisted.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { enforceUsage, UsageLimitError } from "@/lib/usage";
import {
  ALLOWED_MIME,
  MAX_FILE_BYTES,
  extractTextFromFile,
  structureResumeFromText,
} from "@/lib/extract.server";

export const Route = createFileRoute("/api/extract")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Supabase not configured", { status: 500 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice(7).trim();
        if (!token || token.split(".").length !== 3) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response("Expected multipart/form-data", { status: 400 });
        }
        const file = form.get("file");
        const mode = (form.get("mode") as string | null) ?? "resume";
        if (!(file instanceof File)) {
          return new Response("Missing file", { status: 400 });
        }
        // Browsers report .docx MIME inconsistently (often "" or "application/octet-stream").
        // Fall back to the filename extension when the reported type isn't in the allow-list.
        const EXT_MIME: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          webp: "image/webp",
        };
        const ext = (file.name.split(".").pop() ?? "").toLowerCase();
        let mime = file.type;
        if (!ALLOWED_MIME.has(mime) && EXT_MIME[ext]) {
          mime = EXT_MIME[ext];
        }
        if (!ALLOWED_MIME.has(mime)) {
          return Response.json(
            { error: "Only PDF, DOCX, PNG, JPEG, or WEBP files are supported." },
            { status: 415 },
          );
        }
        if (file.size > MAX_FILE_BYTES) {
          return Response.json({ error: "File is too large (10MB max)." }, { status: 413 });
        }

        try {
          await enforceUsage(supabase, userId, "parse_resume");
        } catch (e) {
          if (e instanceof UsageLimitError) {
            return Response.json({ error: e.message, limitReached: true }, { status: 429 });
          }
          throw e;
        }

        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const text = await extractTextFromFile(bytes, mime, key);
          if (!text || text.trim().length < 20) {
            return Response.json(
              { error: "We couldn't read any text from that file. Try a different export." },
              { status: 422 },
            );
          }
          if (mode === "text") {
            return Response.json({ text, filename: file.name });
          }
          const resume = await structureResumeFromText(text, key);
          return Response.json({ text, resume, filename: file.name });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Extraction failed";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
