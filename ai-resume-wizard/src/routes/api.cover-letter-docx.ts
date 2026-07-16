import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Cover letter DOCX export — business-letter layout. Separate route from the
// resume DOCX so edits here cannot regress `/api/resume-docx`.

const SenderInput = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
});

const Input = z.object({
  sender: SenderInput,
  company: z.string().optional().default(""),
  role: z.string().optional().default(""),
  recipient: z.string().optional().default(""),
  coverLetter: z.string().min(1),
});

export const Route = createFileRoute("/api/cover-letter-docx")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsed = Input.safeParse(raw);
        if (!parsed.success) return new Response("Invalid input", { status: 400 });
        const data = parsed.data;
        const S = data.sender;

        const { Document, Packer, Paragraph, TextRun } = await import("docx");

        const P = (
          text: string,
          opts: { bold?: boolean; size?: number; italics?: boolean; color?: string } = {},
        ) =>
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text,
                bold: opts.bold,
                italics: opts.italics,
                size: opts.size ?? 22,
                color: opts.color,
              }),
            ],
          });

        const children: InstanceType<typeof Paragraph>[] = [];

        if (S.name) children.push(P(S.name, { bold: true, size: 24 }));
        const contact = [S.email, S.phone, S.location].filter(Boolean).join(" • ");
        if (contact) children.push(P(contact, { size: 20, color: "6A6A78" }));

        children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));

        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        children.push(P(today));

        if (data.company) children.push(P(data.company, { bold: true }));
        children.push(P(data.recipient || "Hiring Team"));

        children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));

        const greetingName = data.recipient || "Hiring Team";
        children.push(P(`Dear ${greetingName},`));

        const rawBody = data.coverLetter.trim();
        const paragraphs = rawBody
          .split(/\n\s*\n+/)
          .map((p) => p.replace(/\s+\n/g, " ").replace(/\n/g, " ").trim())
          .filter(Boolean);
        const last = paragraphs[paragraphs.length - 1] ?? "";
        if (/^(sincerely|regards|best|thank you)[\s,]/i.test(last) && last.length < 160) {
          paragraphs.pop();
        }

        for (const p of paragraphs) children.push(P(p));

        children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));
        children.push(P("Sincerely,"));
        children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun("")] }));
        if (S.name) children.push(P(S.name, { bold: true }));

        const doc = new Document({
          sections: [
            {
              properties: {
                page: {
                  size: { width: 12240, height: 15840 },
                  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                },
              },
              children,
            },
          ],
        });

        const buffer = await Packer.toBuffer(doc);
        const slug = (S.name || "Cover_Letter").replace(/[^a-z0-9]/gi, "_");
        const filename = data.company
          ? `${slug}_Cover_Letter_${data.company.replace(/[^a-z0-9]/gi, "_")}.docx`
          : `${slug}_Cover_Letter.docx`;

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
