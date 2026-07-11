import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { RESUME } from "./resume-data";

const PdfInput = z.object({
  summary: z.string(),
  bullets: z.array(z.object({ company: z.string(), bullets: z.array(z.string()) })),
  company: z.string().optional().default(""),
  role: z.string().optional().default(""),
});

export const generateTailoredPdf = createServerFn({ method: "POST", response: "raw" })
  .inputValidator((input: unknown) => PdfInput.parse(input))
  .handler(async ({ data }) => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const doc = await PDFDocument.create();
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

    const PAGE_W = 612;
    const PAGE_H = 792;
    const MARGIN = 48;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    const TEXT_COLOR = rgb(0.1, 0.1, 0.12);
    const MUTED = rgb(0.42, 0.42, 0.48);
    const ACCENT = rgb(0.13, 0.32, 0.72);

    let page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const wrap = (text: string, font: typeof helv, size: number, maxW: number) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) > maxW && line) {
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
      const size = opts.size ?? 10;
      const color = opts.color ?? TEXT_COLOR;
      const maxW = opts.maxW ?? CONTENT_W;
      const lines = wrap(text, font, size, maxW);
      const lineH = size * 1.28;
      for (const l of lines) {
        needSpace(lineH);
        page.drawText(l, { x: MARGIN, y: y - size, size, font, color });
        y -= lineH;
      }
      y -= opts.gapAfter ?? 0;
    };

    const drawBullet = (text: string) => {
      const size = 9.5;
      const font = helv;
      const bulletIndent = 12;
      const maxW = CONTENT_W - bulletIndent;
      const lines = wrap(text, font, size, maxW);
      const lineH = size * 1.32;
      needSpace(lineH);
      page.drawText("•", { x: MARGIN, y: y - size, size, font: bold, color: ACCENT });
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) needSpace(lineH);
        page.drawText(lines[i], {
          x: MARGIN + bulletIndent,
          y: y - size,
          size,
          font,
          color: TEXT_COLOR,
        });
        y -= lineH;
      }
    };

    const rule = () => {
      needSpace(6);
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + CONTENT_W, y },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.88),
      });
      y -= 8;
    };

    const sectionHeader = (label: string) => {
      needSpace(24);
      y -= 4;
      page.drawText(label.toUpperCase(), {
        x: MARGIN,
        y: y - 9,
        size: 9,
        font: bold,
        color: MUTED,
      });
      y -= 14;
      rule();
    };

    // HEADER
    page.drawText(RESUME.name, { x: MARGIN, y: y - 22, size: 22, font: bold, color: TEXT_COLOR });
    y -= 28;
    page.drawText(RESUME.title, { x: MARGIN, y: y - 12, size: 12, font: helv, color: ACCENT });
    y -= 18;
    const contact = `${RESUME.email}  •  ${RESUME.phone}  •  ${RESUME.location}`;
    page.drawText(contact, { x: MARGIN, y: y - 9, size: 9, font: helv, color: MUTED });
    y -= 16;
    if (data.company || data.role) {
      const targ = `Tailored for: ${[data.role, data.company].filter(Boolean).join(" @ ")}`;
      page.drawText(targ, { x: MARGIN, y: y - 8, size: 8, font: italic, color: MUTED });
      y -= 14;
    }
    rule();

    // SUMMARY
    sectionHeader("Professional Summary");
    drawText(data.summary, { size: 10, gapAfter: 6 });

    // COMPETENCIES
    sectionHeader("Core Competencies");
    const compsLine = RESUME.competencies.join("  •  ");
    drawText(compsLine, { size: 9.5, color: TEXT_COLOR, gapAfter: 4 });

    // EXPERIENCE
    sectionHeader("Career Experience");
    for (const role of RESUME.experience) {
      const overridden = data.bullets.find(
        (b) => b.company.toLowerCase() === role.company.toLowerCase(),
      );
      const bullets = overridden?.bullets?.length ? overridden.bullets : role.bullets;

      needSpace(30);
      page.drawText(role.title, { x: MARGIN, y: y - 11, size: 11, font: bold, color: TEXT_COLOR });
      const dateW = helv.widthOfTextAtSize(role.dates, 9);
      page.drawText(role.dates, {
        x: MARGIN + CONTENT_W - dateW,
        y: y - 11,
        size: 9,
        font: helv,
        color: MUTED,
      });
      y -= 14;
      page.drawText(`${role.company} — ${role.location}`, {
        x: MARGIN,
        y: y - 9,
        size: 9.5,
        font: italic,
        color: ACCENT,
      });
      y -= 14;
      for (const b of bullets) drawBullet(b);
      y -= 6;
    }

    // ADDITIONAL
    sectionHeader("Additional Experience");
    for (const a of RESUME.additionalExperience) drawText(a, { size: 9.5, gapAfter: 2 });

    // PROFICIENCIES
    sectionHeader("AI & Technical Proficiencies");
    for (const p of RESUME.proficiencies) {
      const labelW = bold.widthOfTextAtSize(`${p.label}: `, 9.5);
      needSpace(14);
      page.drawText(`${p.label}: `, { x: MARGIN, y: y - 9, size: 9.5, font: bold, color: ACCENT });
      const lines = wrap(p.value, helv, 9.5, CONTENT_W - labelW);
      page.drawText(lines[0] ?? "", {
        x: MARGIN + labelW,
        y: y - 9,
        size: 9.5,
        font: helv,
        color: TEXT_COLOR,
      });
      y -= 13;
      for (let i = 1; i < lines.length; i++) {
        needSpace(13);
        page.drawText(lines[i], { x: MARGIN + labelW, y: y - 9, size: 9.5, font: helv, color: TEXT_COLOR });
        y -= 13;
      }
      y -= 2;
    }

    // EDUCATION
    sectionHeader("Education");
    drawText(RESUME.education.degree, { size: 10, font: bold, gapAfter: 0 });
    drawText(RESUME.education.school, { size: 9.5, color: MUTED, gapAfter: 4 });

    // CERTS
    sectionHeader("Certifications & Credentials");
    for (const c of RESUME.certifications) drawText(`• ${c}`, { size: 9.5, gapAfter: 1 });

    const bytes = await doc.save();
    const filename = data.company
      ? `Christopher_Kendrick_Resume_${data.company.replace(/[^a-z0-9]/gi, "_")}.pdf`
      : "Christopher_Kendrick_Resume_Tailored.pdf";

    // ArrayBuffer for Response body (avoid SharedArrayBuffer typing issues)
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Response(ab, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
