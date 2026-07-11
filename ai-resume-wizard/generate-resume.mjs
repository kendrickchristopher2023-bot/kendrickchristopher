import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  LevelFormat,
} from "docx";

const OUTPUT_DIR = process.argv[2] || "/tmp";

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Inter", size: 21 }, // 11pt
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 22, bold: true, font: "Inter", color: "6B7280" },
        paragraph: {
          spacing: { before: 240, after: 120 },
          outlineLevel: 0,
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: "Inter" },
        paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 1 },
      },
    ],
  },
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
            style: {
              paragraph: { indent: { left: 360, hanging: 180 }, spacing: { after: 80 } },
            },
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
      children: [
        // Header
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "Christopher Kendrick",
              bold: true,
              size: 40,
              font: "Georgia",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "AI Deployment & Enablement Manager",
              size: 26,
              color: "2563EB",
              font: "Inter",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: "kendrickchristopher@hotmail.com  •  (404) 358-0626  •  LinkedIn  •  Concord, NC  |  Open to relocation – New York, NY",
              size: 18,
              color: "6B7280",
              font: "Inter",
            }),
          ],
        }),

        // Professional Summary
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Professional Summary")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Results-driven AI deployment and customer enablement specialist with 10+ years of experience designing and delivering training programs that accelerate product adoption across enterprise organizations. Proven track record of translating complex technical capabilities — including AI-powered tools — into accessible, high-impact learning experiences for audiences ranging from front-line employees to C-suite executives. Hands-on builder of AI automation solutions using Claude, Lovable AI, and ChatGPT. Experienced leading cross-functional implementation teams, managing concurrent enterprise accounts, and developing scalable enablement playbooks that drive measurable business outcomes.",
              size: 20,
            }),
          ],
        }),

        // Core Competencies
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Core Competencies")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "AI Product Enablement  •  Enterprise Onboarding & Adoption  •  Instructional Design  •  Executive Stakeholder Engagement  •  AI Tool Development (Claude / Lovable)  •  Change Management  •  Scalable Playbook Development  •  Workshop Design & Facilitation  •  Cross-functional Team Leadership  •  KPI Monitoring & Optimization  •  Technical Implementation  •  Customer Lifecycle Management",
              size: 20,
            }),
          ],
        }),

        // Career Experience
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 120 },
          children: [new TextRun("Career Experience")],
        }),

        // Mews
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: "Customer Onboarding & AI Enablement Manager",
              bold: true,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Mews PMS  |  Prague, CZ (Remote)   2024 – Present",
              italics: true,
              color: "2563EB",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Built an AI-powered reservation file converter using Lovable and Claude that fully automated a previously manual data migration process — saving Onboarding Managers and clients hours to days of effort per implementation.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Designed and delivered monthly system training to new Mews clients and new hires via MS Teams, translating complex software features into practical, accessible workflows for diverse enterprise audiences.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Reduced onboarding time by 20% by designing a structured onboarding program with standardized workflows, user manuals, and best-practice guides that improved self-service adoption and client confidence.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Successfully managed 10–20 enterprise customer accounts simultaneously, guiding each from initial configuration to live deployment within a 2–4 week cycle.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Integrated enterprise properties with key partner platforms — SiteMinder, Booking.com, Expedia, QuickBooks Online — ensuring seamless operational connectivity at go-live.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Managed a team of onboarding consultants, facilitating knowledge-sharing, troubleshooting escalations, and professional development to maintain consistent service delivery quality.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Built a Salesforce-to-Slack daily reporting tool using Claude that surfaces real-time project status for all assigned accounts, increasing management visibility and team accountability.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Built a project handover automation with Claude and Lovable that generates management-ready status reports, ensuring zero disruption during planned absences.",
              size: 20,
            }),
          ],
        }),

        // PurpleCloud
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: "Training & Implementation Manager",
              bold: true,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "PurpleCloud Technologies  |  Atlanta, GA (Remote)   2018 – 2024",
              italics: true,
              color: "2563EB",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Cut training time by 60% (5 days → 2) and implementation time by 50% (2 months → 1 month) through redesigned onboarding curriculum and streamlined delivery processes.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Guided C-suite stakeholders through software adoption by identifying individual training needs, tailoring sessions, and connecting product capabilities to business objectives.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Led live webinars, on-site training sessions, and produced recorded instructional content using ScreenPal, ensuring flexible and scalable enablement across distributed enterprise teams.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Configured and integrated Property Management Systems (Opera, Maestro) to meet diverse customer environments, translating complex technical requirements into functional enterprise deployments.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Developed and maintained up-to-date training materials, client newsletters (Constant Contact), and product update communications to sustain engagement and adoption post-launch.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Documented client bugs, feature requests, and usability concerns in Zendesk and HubSpot, routing insights to engineering via Pivotal Tracker to inform product development.",
              size: 20,
            }),
          ],
        }),

        // Amadeus
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200 },
          children: [
            new TextRun({
              text: "Systems Administrator & Senior Support Analyst",
              bold: true,
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Amadeus  |  Atlanta, GA   2013 – 2018",
              italics: true,
              color: "2563EB",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Provided enterprise-level technical support and systems administration for Hotel SalesPro users across North America; recognized as a Top Performer in 2017 for resolving the second-highest number of support cases company-wide.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Led performance analyses and continuous improvement initiatives across the product support function, reducing employee downtime through proactive training and change management.",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({
              text: "Managed hardware and software migrations — including legacy-to-new-platform transitions — with minimal business disruption.",
              size: 20,
            }),
          ],
        }),

        // Additional Experience
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 120 },
          children: [new TextRun("Additional Experience")],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "Help Desk Support Analyst & Hardware Integration Specialist — Medquest Associates (Contractual), Alpharetta, GA",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Systems Administrator | Sales Support Representative & Point-of-Sales Specialist — PeopleNet, Inc., Atlanta, GA",
              size: 20,
            }),
          ],
        }),

        // AI & Technical Proficiencies
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("AI & Technical Proficiencies")],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "AI & Automation: ", bold: true, size: 20 }),
            new TextRun({
              text: "Claude (API / Claude Code), Lovable AI, ChatGPT, Glean AI, Chat & Ask AI, Power BI",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "Customer Success & CRM: ", bold: true, size: 20 }),
            new TextRun({
              text: "Salesforce, Gainsight, HubSpot, Zendesk, Gong, Clari Copilot, Jira, Confluence",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: "Training & Enablement: ", bold: true, size: 20 }),
            new TextRun({
              text: "Talent LMS, Appcues, ScreenPal, Loom, Canva, SurveyMonkey, Constant Contact",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Collaboration & PM: ", bold: true, size: 20 }),
            new TextRun({
              text: "Slack, MS Teams, Monday.com, Asana, Trello, Tallyfy, SharePoint, Confluence, WebEx",
              size: 20,
            }),
          ],
        }),

        // Education
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Education")],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "Bachelor of Science in Business Management  |  GPA 3.6",
              bold: true,
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "University of Phoenix  |  Atlanta, GA",
              size: 20,
              color: "6B7280",
            }),
          ],
        }),

        // Certifications
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Certifications & Credentials")],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "• Mews PMS Onboarding Manager Certification — Mews",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "• Value-First Onboarding — Appcues",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "• Salesforce Training — Amadeus",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "• CompTIA A+ Certification — Mercer University-ICTS",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "• Public Key Infrastructure (PKI) Certification — Novartis Pharmaceuticals",
              size: 20,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "• Help Desk 2000/e>Support Certification — STI Knowledge",
              size: 20,
            }),
          ],
        }),
      ],
    },
  ],
});

const outputPath = path.join(OUTPUT_DIR, "Christopher_Kendrick_Resume.docx");
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log("DOCX written to", outputPath);
