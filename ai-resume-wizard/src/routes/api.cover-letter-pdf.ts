import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Cover letter PDF export — business-letter layout, embedded fonts,
// selectable text. Independent of the resume PDF route so any edits here
// cannot regress `/api/tailored-resume`.

const SenderInput = z.object({
  name: z.string().max(200).default(""),
  email: z.string().max(320).default(""),
  phone: z.string().max(80).default(""),
  location: z.string().max(200).default(""),
});

const Input = z.object({
  sender: SenderInput,
  company: z.string().max(300).optional().default(""),
  role: z.string().max(300).optional().default(""),
  recipient: z.string().max(200).optional().default(""),
  coverLetter: z.string().min(1).max(20000),
});

const MAX_BODY_BYTES = 64 * 1024;

export const Route = createFileRoute("/api/cover-letter-pdf")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bodyText = await request.text();
        if (bodyText.length > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }
        let raw: unknown;
        try {
          raw = JSON.parse(bodyText);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Input.safeParse(raw);
        if (!parsed.success) {
          return new Response("Invalid input: " + parsed.error.message, { status: 400 });
        }
        const data = parsed.data;
        const S = data.sender;

        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

        const doc = await PDFDocument.create();
        const helv = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);

        const PAGE_W = 612;
        const PAGE_H = 792;
        const MARGIN = 72; // 1in — business letter standard
        const CONTENT_W = PAGE_W - MARGIN * 2;
        const TEXT_COLOR = rgb(0.1, 0.1, 0.12);
        const MUTED = rgb(0.42, 0.42, 0.48);

        let page = doc.addPage([PAGE_W, PAGE_H]);
        let y = PAGE_H - MARGIN;

        const sanitize = (s: string) =>
          s
            .replace(/[\u2013\u2014]/g, "-")
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\u2022/g, "-")
            .replace(/\u2192/g, "->")
            .replace(/\u2190/g, "<-")
            .replace(/\u25B8/g, ">")
            .replace(/[^\x00-\xFF]/g, "?");

        const wrap = (text: string, font: typeof helv, size: number, maxW: number) => {
          const words = text.split(/\s+/);
          const lines: string[] = [];
          let line = "";
          for (const w of words) {
            const test = line ? `${line} ${w}` : w;
            if (font.widthOfTextAtSize(sanitize(test), size) > maxW && line) {
              lines.push(line);
              line = w;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
          return lines;
        };

        const needSpace = (h: number) => {
          if (y - h < MARGIN) {
            page = doc.addPage([PAGE_W, PAGE_H]);
            y = PAGE_H - MARGIN;
          }
        };

        const drawText = (
          text: string,
          opts: {
            font?: typeof helv;
            size?: number;
            color?: ReturnType<typeof rgb>;
            gapAfter?: number;
            maxW?: number;
          } = {},
        ) => {
          const font = opts.font ?? helv;
          const size = opts.size ?? 11;
          const color = opts.color ?? TEXT_COLOR;
          const maxW = opts.maxW ?? CONTENT_W;
          const lines = text === "" ? [""] : wrap(text, font, size, maxW);
          const lineH = size * 1.4;
          for (const l of lines) {
            needSpace(lineH);
            page.drawText(sanitize(l), { x: MARGIN, y: y - size, size, font, color });
            y -= lineH;
          }
          y -= opts.gapAfter ?? 0;
        };

        // Sender block
        if (S.name) drawText(S.name, { font: bold, size: 12 });
        const contactParts = [S.email, S.phone, S.location].filter(Boolean);
        if (contactParts.length) drawText(contactParts.join(" • "), { size: 10, color: MUTED });
        y -= 10;

        // Date
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        drawText(today, { size: 11, gapAfter: 10 });

        // Recipient
        const recipientLine = data.recipient || "Hiring Team";
        if (data.company) drawText(data.company, { font: bold, size: 11 });
        drawText(recipientLine, { size: 11, gapAfter: 14 });

        // Greeting
        const greetingName = data.recipient || "Hiring Team";
        drawText(`Dear ${greetingName},`, { size: 11, gapAfter: 10 });

        // Body — split on blank lines into paragraphs; skip signature-ish lines
        // if the AI already appended one (we always add our own sign-off).
        const rawBody = data.coverLetter.trim();
        const paragraphs = rawBody
          .split(/\n\s*\n+/)
          .map((p) => p.replace(/\s+\n/g, " ").replace(/\n/g, " ").trim())
          .filter(Boolean);

        // Strip a leading "Dear ...," greeting the model may include — we
        // render our own greeting above.
        if (paragraphs.length && /^dear\b[^.\n]{0,60}[,:]/i.test(paragraphs[0])) {
          paragraphs.shift();
        }

        // Strip a trailing "Sincerely, Name" the model may add.
        const lastPara = paragraphs[paragraphs.length - 1] ?? "";
        if (/^(sincerely|regards|best|thank you)[\s,]/i.test(lastPara) && lastPara.length < 160) {
          paragraphs.pop();
        }

        for (const p of paragraphs) {
          drawText(p, { size: 11, gapAfter: 10 });
        }

        // Sign-off
        y -= 4;
        drawText("Sincerely,", { size: 11, gapAfter: 26 });
        if (S.name) drawText(S.name, { font: bold, size: 11 });

        const bytes = await doc.save();
        const slug = (S.name || "Cover_Letter").replace(/[^a-z0-9]/gi, "_");
        const filename = data.company
          ? `${slug}_Cover_Letter_${data.company.replace(/[^a-z0-9]/gi, "_")}.pdf`
          : `${slug}_Cover_Letter.pdf`;

        const ab = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        return new Response(ab, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      },
    },
  },
});
