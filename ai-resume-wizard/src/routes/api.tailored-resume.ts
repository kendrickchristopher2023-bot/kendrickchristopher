import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Accepts the caller's full master resume JSON in the body so this endpoint
// works for any signed-in user (not just one hardcoded person). Renders a
// single-column, ATS-friendly PDF using real embedded fonts (selectable text,
// not a rasterized image) with the standard section headings screeners parse.

const ResumeInput = z.object({
  name: z.string().default(""),
  title: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  github: z.string().default(""),
  linkedin: z.string().default(""),
  summary: z.string().default(""),
  competencies: z.array(z.string()).default([]),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string(),
        location: z.string().default(""),
        dates: z.string().default(""),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  additionalExperience: z.array(z.string()).default([]),
  proficiencies: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  education: z.object({ degree: z.string().default(""), school: z.string().default("") }).default({
    degree: "",
    school: "",
  }),
  certifications: z.array(z.string()).default([]),
});

const PdfInput = z.object({
  resume: ResumeInput,
  // Optional tailor override
  summary: z.string().optional(),
  bullets: z
    .array(z.object({ company: z.string(), bullets: z.array(z.string()) }))
    .optional()
    .default([]),
  company: z.string().optional().default(""),
  role: z.string().optional().default(""),
});

export const Route = createFileRoute("/api/tailored-resume")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = PdfInput.safeParse(raw);
        if (!parsed.success) {
          return new Response("Invalid input: " + parsed.error.message, { status: 400 });
        }
        const data = parsed.data;
        const R = data.resume;
        const overrideBullets = data.bullets ?? [];

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
          opts: { font?: typeof helv; size?: number; color?: ReturnType<typeof rgb>; gapAfter?: number; maxW?: number } = {},
        ) => {
          const font = opts.font ?? helv;
          const size = opts.size ?? 10;
          const color = opts.color ?? TEXT_COLOR;
          const maxW = opts.maxW ?? CONTENT_W;
          const lines = wrap(text, font, size, maxW);
          const lineH = size * 1.28;
          for (const l of lines) {
            needSpace(lineH);
            page.drawText(sanitize(l), { x: MARGIN, y: y - size, size, font, color });
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
          page.drawText("-", { x: MARGIN, y: y - size, size, font: bold, color: ACCENT });
          for (let i = 0; i < lines.length; i++) {
            if (i > 0) needSpace(lineH);
            page.drawText(sanitize(lines[i]), { x: MARGIN + bulletIndent, y: y - size, size, font, color: TEXT_COLOR });
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
          page.drawText(sanitize(label.toUpperCase()), { x: MARGIN, y: y - 9, size: 9, font: bold, color: MUTED });
          y -= 14;
          rule();
        };

        // Header
        if (R.name) {
          page.drawText(sanitize(R.name), { x: MARGIN, y: y - 22, size: 22, font: bold, color: TEXT_COLOR });
          y -= 28;
        }
        if (R.title) {
          page.drawText(sanitize(R.title), { x: MARGIN, y: y - 12, size: 12, font: helv, color: ACCENT });
          y -= 18;
        }
        const contactParts = [R.email, R.phone, R.github, R.linkedin, R.location].filter(Boolean);
        if (contactParts.length) {
          page.drawText(sanitize(contactParts.join("  •  ")), {
            x: MARGIN,
            y: y - 9,
            size: 9,
            font: helv,
            color: MUTED,
          });
          y -= 16;
        }
        if (data.company || data.role) {
          const targ = `Tailored for: ${[data.role, data.company].filter(Boolean).join(" @ ")}`;
          page.drawText(sanitize(targ), { x: MARGIN, y: y - 8, size: 8, font: italic, color: MUTED });
          y -= 14;
        }
        rule();

        // Summary (ATS-standard heading)
        if (data.summary || R.summary) {
          sectionHeader("Summary");
          drawText(data.summary || R.summary, { size: 10, gapAfter: 6 });
        }

        // Skills (ATS-standard heading; single-column list for parsers)
        if (R.competencies.length) {
          sectionHeader("Skills");
          drawText(R.competencies.join(" • "), { size: 9.5, gapAfter: 4 });
        }

        // Experience
        if (R.experience.length) {
          sectionHeader("Experience");
          for (const role of R.experience) {
            const overridden = overrideBullets.find(
              (b) => b.company.toLowerCase() === role.company.toLowerCase(),
            );
            const bullets = overridden?.bullets?.length ? overridden.bullets : role.bullets;
            needSpace(30);
            page.drawText(sanitize(role.title), { x: MARGIN, y: y - 11, size: 11, font: bold, color: TEXT_COLOR });
            const dateW = helv.widthOfTextAtSize(sanitize(role.dates), 9);
            page.drawText(sanitize(role.dates), {
              x: MARGIN + CONTENT_W - dateW,
              y: y - 11,
              size: 9,
              font: helv,
              color: MUTED,
            });
            y -= 14;
            const sub = [role.company, role.location].filter(Boolean).join(" — ");
            if (sub) {
              page.drawText(sanitize(sub), { x: MARGIN, y: y - 9, size: 9.5, font: italic, color: ACCENT });
              y -= 14;
            }
            for (const b of bullets) drawBullet(b);
            y -= 6;
          }
        }

        if (R.additionalExperience.length) {
          sectionHeader("Additional Experience");
          for (const a of R.additionalExperience) drawText(a, { size: 9.5, gapAfter: 2 });
        }

        if (R.proficiencies.length) {
          sectionHeader("Technical Proficiencies");
          for (const p of R.proficiencies) {
            const labelW = bold.widthOfTextAtSize(sanitize(`${p.label}: `), 9.5);
            needSpace(14);
            page.drawText(sanitize(`${p.label}: `), {
              x: MARGIN,
              y: y - 9,
              size: 9.5,
              font: bold,
              color: ACCENT,
            });
            const lines = wrap(p.value, helv, 9.5, CONTENT_W - labelW);
            page.drawText(sanitize(lines[0] ?? ""), {
              x: MARGIN + labelW,
              y: y - 9,
              size: 9.5,
              font: helv,
              color: TEXT_COLOR,
            });
            y -= 13;
            for (let i = 1; i < lines.length; i++) {
              needSpace(13);
              page.drawText(sanitize(lines[i]), {
                x: MARGIN + labelW,
                y: y - 9,
                size: 9.5,
                font: helv,
                color: TEXT_COLOR,
              });
              y -= 13;
            }
            y -= 2;
          }
        }

        if (R.education.degree || R.education.school) {
          sectionHeader("Education");
          if (R.education.degree) drawText(R.education.degree, { size: 10, font: bold, gapAfter: 0 });
          if (R.education.school) drawText(R.education.school, { size: 9.5, color: MUTED, gapAfter: 4 });
        }

        if (R.certifications.length) {
          sectionHeader("Certifications");
          for (const c of R.certifications) drawText(`- ${c}`, { size: 9.5, gapAfter: 1 });
        }

        const bytes = await doc.save();
        const slug = (R.name || "Resume").replace(/[^a-z0-9]/gi, "_");
        const filename = data.company
          ? `${slug}_Resume_${data.company.replace(/[^a-z0-9]/gi, "_")}.pdf`
          : `${slug}_Resume.pdf`;

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
