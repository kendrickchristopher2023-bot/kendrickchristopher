// Shared extraction helpers. Server-only.
// - Extract raw text from PDF (unpdf), DOCX (mammoth), or images (vision AI).
// - Structure that text into a MasterResume via the same prompt the paste-text
//   onboarding path uses.
// Nothing here persists the raw file; callers process bytes in memory and drop them.

import type { MasterResume } from "./resume-data";

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export function humanTypeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (mime.startsWith("image/")) return "image";
  return "file";
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(bytes);
  const { text } = await extractText(doc, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  // mammoth expects a Buffer-like object with .arrayBuffer
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value ?? "";
}

async function extractImage(
  bytes: Uint8Array,
  mime: string,
  key: string,
): Promise<string> {
  // Send image directly to vision model, ask for a plain-text transcription.
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const b64 = uint8ToBase64(bytes);
  const dataUrl = `data:${mime};base64,${b64}`;
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcribe every piece of resume-relevant text in this image (name, contact, titles, companies, dates, bullets, skills, education). Return plain text only — no commentary, no markdown headers you invent. Preserve the original order.",
          },
          { type: "image", image: dataUrl },
        ],
      },
    ],
  });
  return text;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa exists in Workers runtime
  return btoa(bin);
}

/** Extract plain text from an uploaded file (PDF, DOCX, or image). */
export async function extractTextFromFile(
  bytes: Uint8Array,
  mime: string,
  key: string,
): Promise<string> {
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`Unsupported file type: ${mime}. Upload a PDF, DOCX, PNG, JPEG, or WEBP.`);
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new Error("File is too large (10MB max).");
  }
  if (mime === "application/pdf") return extractPdf(bytes);
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return extractDocx(bytes);
  if (mime.startsWith("image/")) return extractImage(bytes, mime, key);
  throw new Error(`Unsupported file type: ${mime}`);
}

const STRUCTURE_SYSTEM = `You are a resume parser. Extract the user's resume from raw text (resume paste, LinkedIn "About", etc.) into strict JSON. Never invent employers, dates, or metrics — leave fields empty ("" or []) if unknown. Return ONLY valid JSON, no markdown, no commentary.`;

/** Turn raw resume text into a MasterResume via the AI gateway. */
export async function structureResumeFromText(
  text: string,
  key: string,
): Promise<MasterResume> {
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
${text}`;

  const { text: out } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: STRUCTURE_SYSTEM,
    prompt,
  });
  const cleaned = out.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as MasterResume;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI did not return valid JSON. Try a clearer file.");
    return JSON.parse(m[0]) as MasterResume;
  }
}
