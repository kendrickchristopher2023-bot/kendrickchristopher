import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Real DOCX (Word) export with actual text runs — not an image — using
// standard, single-column, ATS-friendly section headings.

const ResumeInput = z.object({
  name: z.string().max(200).default(""),
  title: z.string().max(200).default(""),
  email: z.string().max(320).default(""),
  phone: z.string().max(80).default(""),
  location: z.string().max(200).default(""),
  github: z.string().max(500).default(""),
  linkedin: z.string().max(500).default(""),
  summary: z.string().max(4000).default(""),
  competencies: z.array(z.string().max(200)).max(60).default([]),
  experience: z
    .array(
      z.object({
        title: z.string().max(300),
        company: z.string().max(300),
        location: z.string().max(200).default(""),
        dates: z.string().max(120).default(""),
        bullets: z.array(z.string().max(1000)).max(30).default([]),
      }),
    )
    .max(30)
    .default([]),
  additionalExperience: z.array(z.string().max(1000)).max(30).default([]),
  proficiencies: z
    .array(z.object({ label: z.string().max(200), value: z.string().max(500) }))
    .max(40)
    .default([]),
  education: z
    .object({ degree: z.string().max(300).default(""), school: z.string().max(300).default("") })
    .default({ degree: "", school: "" }),
  certifications: z.array(z.string().max(300)).max(30).default([]),
});

const Input = z.object({
  resume: ResumeInput,
  summary: z.string().max(4000).optional(),
  bullets: z
    .array(
      z.object({
        company: z.string().max(300),
        bullets: z.array(z.string().max(1000)).max(30),
      }),
    )
    .max(30)
    .optional()
    .default([]),
  company: z.string().max(300).optional().default(""),
  role: z.string().max(300).optional().default(""),
});

const MAX_BODY_BYTES = 256 * 1024;

export const Route = createFileRoute("/api/resume-docx")({
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
        if (!parsed.success) return new Response("Invalid input", { status: 400 });
        const data = parsed.data;
        const R = data.resume;
        const override = data.bullets ?? [];

        const {
          Document,
          Packer,
          Paragraph,
          TextRun,
          HeadingLevel,
          AlignmentType,
          LevelFormat,
        } = await import("docx");

        const P = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean; color?: string } = {}) =>
          new Paragraph({
            children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color })],
          });

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

        if (R.name)
          children.push(
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: R.name, bold: true, size: 40 })],
            }),
          );
        if (R.title) children.push(P(R.title, { size: 24, color: "1E4CB8" }));
        const contact = [R.email, R.phone, R.github, R.linkedin, R.location].filter(Boolean).join("  •  ");
        if (contact) children.push(P(contact, { size: 18, color: "6A6A78" }));
        if (data.company || data.role)
          children.push(
            P(`Tailored for: ${[data.role, data.company].filter(Boolean).join(" @ ")}`, {
              size: 16,
              italics: true,
              color: "6A6A78",
            }),
          );

        const summary = data.summary || R.summary;
        if (summary) {
          children.push(H("Summary"));
          children.push(P(summary, { size: 20 }));
        }

        if (R.competencies.length) {
          children.push(H("Skills"));
          children.push(P(R.competencies.join(" • "), { size: 20 }));
        }

        if (R.experience.length) {
          children.push(H("Experience"));
          for (const role of R.experience) {
            children.push(
              new Paragraph({
                spacing: { before: 120 },
                children: [
                  new TextRun({ text: role.title, bold: true, size: 22 }),
                  new TextRun({ text: role.dates ? `    ${role.dates}` : "", size: 18, color: "6A6A78" }),
                ],
              }),
            );
            const sub = [role.company, role.location].filter(Boolean).join(" — ");
            if (sub) children.push(P(sub, { size: 20, italics: true, color: "1E4CB8" }));
            const use =
              override.find((b) => b.company.toLowerCase() === role.company.toLowerCase())?.bullets ??
              role.bullets;
            for (const b of use) children.push(bullet(b));
          }
        }

        if (R.additionalExperience.length) {
          children.push(H("Additional Experience"));
          for (const a of R.additionalExperience) children.push(P(a, { size: 20 }));
        }

        if (R.proficiencies.length) {
          children.push(H("Technical Proficiencies"));
          for (const p of R.proficiencies)
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `${p.label}: `, bold: true, size: 20, color: "1E4CB8" }),
                  new TextRun({ text: p.value, size: 20 }),
                ],
              }),
            );
        }

        if (R.education.degree || R.education.school) {
          children.push(H("Education"));
          if (R.education.degree) children.push(P(R.education.degree, { size: 20, bold: true }));
          if (R.education.school) children.push(P(R.education.school, { size: 19, color: "6A6A78" }));
        }

        if (R.certifications.length) {
          children.push(H("Certifications"));
          for (const c of R.certifications) children.push(bullet(c));
        }

        const doc = new Document({
          numbering: {
            config: [
              {
                reference: "bullets",
                levels: [
                  {
                    level: 0,
                    format: LevelFormat.BULLET,
                    text: "•",
                    alignment: AlignmentType.LEFT,
                    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
                  },
                ],
              },
            ],
          },
          sections: [
            {
              properties: {
                page: {
                  size: { width: 12240, height: 15840 },
                  margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
                },
              },
              children,
            },
          ],
        });

        const buffer = await Packer.toBuffer(doc);
        const slug = (R.name || "Resume").replace(/[^a-z0-9]/gi, "_");
        const filename = data.company
          ? `${slug}_Resume_${data.company.replace(/[^a-z0-9]/gi, "_")}.docx`
          : `${slug}_Resume.docx`;

        const ab = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer;
        return new Response(ab, {
          status: 200,
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      },
    },
  },
});
