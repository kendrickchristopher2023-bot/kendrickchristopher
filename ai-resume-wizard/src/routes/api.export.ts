// Generic document export endpoint. One entry point, three formats:
//   - pdf: single-column, embedded Helvetica, selectable text
//   - docx: real Word paragraphs, ATS-friendly headings
//   - csv:  RFC-4180 escaped rows
//
// Bespoke resume/cover-letter endpoints are intentionally NOT refactored
// into this — they work and are in active use. This is the surface for
// EVERY other download in the app.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { toCsv, sanitizeFilename } from "@/lib/csv";

const KV = z.object({ label: z.string().max(200), value: z.string().max(2000) });
const Section = z.object({
  heading: z.string().max(300).optional(),
  body: z.string().max(20000).optional(),
  items: z.array(z.string().max(4000)).max(200).optional(),
  kv: z.array(KV).max(200).optional(),
});

const DocInput = z.object({
  format: z.enum(["pdf", "docx"]),
  filename: z.string().min(1).max(200),
  title: z.string().max(300).optional(),
  subtitle: z.string().max(500).optional(),
  sections: z.array(Section).max(60).default([]),
});

const CsvInput = z.object({
  format: z.literal("csv"),
  filename: z.string().min(1).max(200),
  headers: z.array(z.string().max(200)).min(1).max(60),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()])).max(60)).max(50000),
});

const Input = z.union([DocInput, CsvInput]);
const MAX_BODY_BYTES = 1024 * 1024; // 1MB

export const Route = createFileRoute("/api/export")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bodyText = await request.text();
        if (bodyText.length > MAX_BODY_BYTES) {
          return new Response("Payload too large", { status: 413 });
        }
        let raw: unknown;
        try { raw = JSON.parse(bodyText); } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Input.safeParse(raw);
        if (!parsed.success) {
          return new Response("Invalid input: " + parsed.error.message, { status: 400 });
        }
        const data = parsed.data;
        const safeName = sanitizeFilename(data.filename);

        if (data.format === "csv") {
          const rows = data.rows.map((r) => r.map((v) => (v == null ? "" : v)));
          const csv = toCsv(data.headers, rows);
          const filename = safeName.endsWith(".csv") ? safeName : `${safeName}.csv`;
          return new Response(csv, {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }

        if (data.format === "docx") {
          const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } =
            await import("docx");

          const P = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean; color?: string } = {}) =>
            new Paragraph({ children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })] });
          const H = (text: string) =>
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 120 },
              children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22 })],
            });
          const bullet = (text: string) =>
            new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun({ text, size: 20 })],
            });

          const children: InstanceType<typeof Paragraph>[] = [];
          if (data.title)
            children.push(new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: data.title, bold: true, size: 36 })],
            }));
          if (data.subtitle) children.push(P(data.subtitle, { size: 22, color: "6A6A78", italics: true }));

          for (const s of data.sections) {
            if (s.heading) children.push(H(s.heading));
            if (s.body) {
              for (const para of s.body.split(/\n\s*\n+/)) {
                const t = para.replace(/\s+\n/g, " ").replace(/\n/g, " ").trim();
                if (t) children.push(P(t, { size: 20 }));
              }
            }
            if (s.items?.length) for (const it of s.items) children.push(bullet(it));
            if (s.kv?.length) for (const kv of s.kv) {
              children.push(new Paragraph({ children: [
                new TextRun({ text: `${kv.label}: `, bold: true, size: 20, color: "1E4CB8" }),
                new TextRun({ text: kv.value, size: 20 }),
              ]}));
            }
          }

          const doc = new Document({
            numbering: {
              config: [{
                reference: "bullets",
                levels: [{
                  level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
                  style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                }],
              }],
            },
            sections: [{ children }],
          });
          const bytes = await Packer.toBuffer(doc);
          const filename = safeName.endsWith(".docx") ? safeName : `${safeName}.docx`;
          const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
          return new Response(ab, {
            status: 200,
            headers: {
              "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        }

        // PDF path
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        const doc = await PDFDocument.create();
        const helv = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
        const PAGE_W = 612, PAGE_H = 792, MARGIN = 54;
        const CONTENT_W = PAGE_W - MARGIN * 2;
        const TEXT_COLOR = rgb(0.1, 0.1, 0.12);
        const MUTED = rgb(0.42, 0.42, 0.48);
        const ACCENT = rgb(0.12, 0.30, 0.72);

        let page = doc.addPage([PAGE_W, PAGE_H]);
        let y = PAGE_H - MARGIN;

        const sanitize = (s: string) =>
          s
            .replace(/[\u2013\u2014]/g, "-").replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"').replace(/\u2022/g, "-")
            .replace(/\u2192/g, "->").replace(/\u2190/g, "<-")
            .replace(/\u25B8/g, ">").replace(/[^\x00-\xFF]/g, "?");

        const wrap = (text: string, font: typeof helv, size: number, maxW: number) => {
          const out: string[] = [];
          for (const raw of text.split(/\n/)) {
            const words = raw.split(/\s+/);
            let line = "";
            for (const w of words) {
              const test = line ? `${line} ${w}` : w;
              if (font.widthOfTextAtSize(sanitize(test), size) > maxW && line) {
                out.push(line); line = w;
              } else line = test;
            }
            out.push(line);
          }
          return out;
        };
        const needSpace = (h: number) => {
          if (y - h < MARGIN) { page = doc.addPage([PAGE_W, PAGE_H]); y = PAGE_H - MARGIN; }
        };
        const drawText = (text: string, opts: { font?: typeof helv; size?: number; color?: ReturnType<typeof rgb>; gapAfter?: number; indent?: number } = {}) => {
          const font = opts.font ?? helv;
          const size = opts.size ?? 11;
          const color = opts.color ?? TEXT_COLOR;
          const indent = opts.indent ?? 0;
          const maxW = CONTENT_W - indent;
          const lines = text === "" ? [""] : wrap(text, font, size, maxW);
          const lineH = size * 1.35;
          for (const l of lines) {
            needSpace(lineH);
            page.drawText(sanitize(l), { x: MARGIN + indent, y: y - size, size, font, color });
            y -= lineH;
          }
          y -= opts.gapAfter ?? 0;
        };

        if (data.title) drawText(data.title, { font: bold, size: 22, gapAfter: 4 });
        if (data.subtitle) drawText(data.subtitle, { font: italic, size: 12, color: MUTED, gapAfter: 12 });
        else if (data.title) y -= 8;

        for (const s of data.sections) {
          if (s.heading) {
            y -= 6;
            drawText(s.heading.toUpperCase(), { font: bold, size: 12, color: ACCENT, gapAfter: 6 });
          }
          if (s.body) drawText(s.body, { size: 11, gapAfter: 8 });
          if (s.items?.length) {
            for (const it of s.items) {
              drawText(`- ${it}`, { size: 11, indent: 12, gapAfter: 2 });
            }
            y -= 4;
          }
          if (s.kv?.length) {
            for (const kv of s.kv) {
              drawText(`${kv.label}: ${kv.value}`, { size: 11, gapAfter: 2 });
            }
            y -= 4;
          }
        }

        const bytes = await doc.save();
        const filename = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
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
