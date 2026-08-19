import {
  COVER_LETTER_PARAGRAPHS,
  RESUME_ADDITIONAL,
  RESUME_CERTIFICATIONS,
  RESUME_CONTACT,
  RESUME_EDUCATION,
  RESUME_EXPERIENCE,
  RESUME_SKILLS,
  RESUME_SUMMARY,
  RESUME_TECH,
} from "./resume-data";

const CONTACT_LINE = `${RESUME_CONTACT.email} | ${RESUME_CONTACT.phone} | ${RESUME_CONTACT.linkedin} | ${RESUME_CONTACT.location}`;
const LETTER_CONTACT_LINE = `${RESUME_CONTACT.location} | ${RESUME_CONTACT.email} | ${RESUME_CONTACT.phone} | ${RESUME_CONTACT.linkedin}`;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------------------------------- PDF ---------------------------------- */

type PdfCtx = {
  doc: import("jspdf").jsPDF;
  y: number;
  margin: number;
  width: number;
  bottom: number;
};

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > ctx.bottom) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

function writeText(
  ctx: PdfCtx,
  text: string,
  opts: {
    size?: number;
    style?: "normal" | "bold" | "italic";
    indent?: number;
    gap?: number;
    bullet?: boolean;
  } = {},
) {
  const size = opts.size ?? 10;
  const indent = opts.indent ?? 0;
  ctx.doc.setFont("helvetica", opts.style ?? "normal");
  ctx.doc.setFontSize(size);
  const lines = ctx.doc.splitTextToSize(text, ctx.width - indent) as string[];
  const lineHeight = size * 1.4;
  lines.forEach((line, index) => {
    ensureSpace(ctx, lineHeight);
    if (index === 0 && opts.bullet) {
      ctx.doc.text("\u2022", ctx.margin + 2, ctx.y);
    }
    ctx.doc.text(line, ctx.margin + indent, ctx.y);
    ctx.y += lineHeight;
  });
  ctx.y += opts.gap ?? 0;
}

function sectionHeading(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 26);
  ctx.y += 8;
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(11);
  ctx.doc.setTextColor(30, 30, 30);
  ctx.doc.text(text.toUpperCase(), ctx.margin, ctx.y);
  ctx.y += 5;
  ctx.doc.setDrawColor(120, 120, 120);
  ctx.doc.line(ctx.margin, ctx.y, ctx.margin + ctx.width, ctx.y);
  ctx.y += 12;
  ctx.doc.setTextColor(20, 20, 20);
}

async function newPdf() {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54;
  const ctx: PdfCtx = {
    doc,
    y: margin,
    margin,
    width: doc.internal.pageSize.getWidth() - margin * 2,
    bottom: doc.internal.pageSize.getHeight() - margin,
  };
  return ctx;
}

export async function downloadResumePdf() {
  const ctx = await newPdf();
  writeText(ctx, RESUME_CONTACT.name, { size: 20, style: "bold", gap: 2 });
  writeText(ctx, RESUME_CONTACT.title, { size: 12, gap: 2 });
  writeText(ctx, CONTACT_LINE, { size: 9, gap: 2 });

  sectionHeading(ctx, "Summary");
  writeText(ctx, RESUME_SUMMARY);

  sectionHeading(ctx, "Skills");
  writeText(ctx, RESUME_SKILLS.join(", "));

  sectionHeading(ctx, "Experience");
  RESUME_EXPERIENCE.forEach((job, i) => {
    if (i > 0) ctx.y += 8;
    writeText(ctx, `${job.role}, ${job.company}`, { size: 11, style: "bold" });
    writeText(ctx, job.dates, { size: 9, style: "italic", gap: 3 });
    job.bullets.forEach((bullet) => {
      writeText(ctx, bullet, { indent: 14, bullet: true });
    });
  });

  sectionHeading(ctx, "Additional Experience");
  RESUME_ADDITIONAL.forEach((item) => {
    writeText(ctx, item, { indent: 14, bullet: true });
  });

  sectionHeading(ctx, "Technical Proficiencies");
  RESUME_TECH.forEach((group) => {
    writeText(ctx, `${group.label}: ${group.value}`, { gap: 2 });
  });

  sectionHeading(ctx, "Education");
  writeText(ctx, RESUME_EDUCATION);

  sectionHeading(ctx, "Certifications");
  writeText(ctx, RESUME_CERTIFICATIONS.join("; "));

  downloadBlob(ctx.doc.output("blob"), "Christopher_Kendrick_Resume.pdf");
}

export async function downloadCoverLetterPdf() {
  const ctx = await newPdf();
  writeText(ctx, RESUME_CONTACT.name, { size: 20, style: "bold", gap: 2 });
  writeText(ctx, LETTER_CONTACT_LINE, { size: 9, gap: 18 });

  writeText(ctx, "Dear Hiring Manager,", { size: 11, gap: 10 });
  COVER_LETTER_PARAGRAPHS.forEach((paragraph) => {
    writeText(ctx, paragraph, { size: 10.5, gap: 12 });
  });
  writeText(ctx, "Sincerely,", { size: 11, gap: 4 });
  writeText(ctx, RESUME_CONTACT.name, { size: 11, style: "bold" });

  downloadBlob(ctx.doc.output("blob"), "Christopher_Kendrick_Cover_Letter.pdf");
}

/* --------------------------------- DOCX ---------------------------------- */

export async function downloadResumeDocx() {
  const docx = await import("docx");
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 260, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 },
      },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: "Arial" })],
    });

  const body = (text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}) =>
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text,
          bold: opts.bold ?? false,
          italics: opts.italics ?? false,
          size: opts.size ?? 20,
          font: "Arial",
        }),
      ],
    });

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: "resume-bullets", level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text, size: 20, font: "Arial" })],
    });

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: RESUME_CONTACT.name, bold: true, size: 40, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: RESUME_CONTACT.title, size: 24, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: CONTACT_LINE, size: 18, font: "Arial" })],
    }),
    heading("Summary"),
    body(RESUME_SUMMARY),
    heading("Skills"),
    body(RESUME_SKILLS.join(", ")),
    heading("Experience"),
  ];

  RESUME_EXPERIENCE.forEach((job) => {
    children.push(body(`${job.role}, ${job.company}`, { bold: true, size: 22 }));
    children.push(body(job.dates, { italics: true, size: 18 }));
    job.bullets.forEach((text) => children.push(bullet(text)));
  });

  children.push(heading("Additional Experience"));
  RESUME_ADDITIONAL.forEach((text) => children.push(bullet(text)));

  children.push(heading("Technical Proficiencies"));
  RESUME_TECH.forEach((group) => children.push(body(`${group.label}: ${group.value}`)));

  children.push(heading("Education"));
  children.push(body(RESUME_EDUCATION));

  children.push(heading("Certifications"));
  children.push(body(RESUME_CERTIFICATIONS.join("; ")));

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "resume-bullets",
          levels: [
            {
              level: 0,
              format: docx.LevelFormat.BULLET,
              text: "\u2022",
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

  downloadBlob(await Packer.toBlob(doc), "Christopher_Kendrick_Resume.docx");
}

export async function downloadCoverLetterDocx() {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");

  const para = (text: string, opts: { bold?: boolean; size?: number; after?: number } = {}) =>
    new Paragraph({
      spacing: { after: opts.after ?? 200, line: 300 },
      children: [
        new TextRun({ text, bold: opts.bold ?? false, size: opts.size ?? 22, font: "Arial" }),
      ],
    });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: RESUME_CONTACT.name, bold: true, size: 36, font: "Arial" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: LETTER_CONTACT_LINE, size: 18, font: "Arial" })],
          }),
          para("Dear Hiring Manager,"),
          ...COVER_LETTER_PARAGRAPHS.map((text) => para(text)),
          para("Sincerely,", { after: 60 }),
          para(RESUME_CONTACT.name, { bold: true }),
        ],
      },
    ],
  });

  downloadBlob(await Packer.toBlob(doc), "Christopher_Kendrick_Cover_Letter.docx");
}