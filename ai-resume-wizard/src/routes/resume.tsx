import { createFileRoute, Link } from "@tanstack/react-router";
import { RESUME } from "@/lib/resume-data";


export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: "Christopher Kendrick — AI Deployment & Enablement Manager" },
      {
        name: "description",
        content:
          "Resume of Christopher Kendrick, an AI deployment and customer enablement specialist with 10+ years of experience accelerating enterprise product adoption.",
      },
      {
        property: "og:title",
        content: "Christopher Kendrick — AI Deployment & Enablement Manager",
      },
      {
        property: "og:description",
        content:
          "Resume of Christopher Kendrick, an AI deployment and customer enablement specialist with 10+ years of experience accelerating enterprise product adoption.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: ResumePage,
});

function ResumePage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Download bar */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back home
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="/Christopher_Kendrick_Resume.pdf"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Download PDF
            </a>
            <a
              href="/Christopher_Kendrick_Resume.docx"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Download DOCX
            </a>
          </div>
        </div>

        {/* Resume card */}
        <article className="bg-card text-card-foreground rounded-xl border border-border p-8 sm:p-12 shadow-sm print:shadow-none print:border-0 print:p-0">
          {/* Header */}
          <header className="border-b border-border pb-6 mb-8">
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Christopher Kendrick
            </h1>
            <p className="mt-2 text-xl sm:text-2xl font-medium text-primary">
              AI Deployment & Enablement Manager
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {RESUME.email}
              <span className="mx-2 text-border">•</span>
              {RESUME.phone}
              <span className="mx-2 text-border">•</span>
              <a href={`https://${RESUME.github}`} target="_blank" rel="noreferrer" className="hover:text-primary">{RESUME.github}</a>
              <span className="mx-2 text-border">•</span>
              <a href={`https://${RESUME.linkedin}`} target="_blank" rel="noreferrer" className="hover:text-primary">LinkedIn</a>
              <span className="mx-2 text-border">•</span>
              {RESUME.location}
            </p>
          </header>

          {/* Summary */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Professional Summary
            </h2>
            <p className="text-base leading-relaxed text-foreground">
              Results-driven AI deployment and customer enablement specialist with 10+ years of experience designing and delivering training programs that accelerate product adoption across enterprise organizations. Proven track record of translating complex technical capabilities — including AI-powered tools — into accessible, high-impact learning experiences for audiences ranging from front-line employees to C-suite executives. Hands-on builder of AI automation solutions using Claude, Lovable AI, and ChatGPT. Experienced leading cross-functional implementation teams, managing concurrent enterprise accounts, and developing scalable enablement playbooks that drive measurable business outcomes.
            </p>
          </section>

          {/* Core Competencies */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Core Competencies
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm text-foreground">
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>AI Product Enablement</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Enterprise Onboarding & Adoption</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Instructional Design</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Executive Stakeholder Engagement</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>AI Tool Development (Claude / Lovable)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Change Management</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Scalable Playbook Development</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Workshop Design & Facilitation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Cross-functional Team Leadership</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>KPI Monitoring & Optimization</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Technical Implementation</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">▸</span>
                <span>Customer Lifecycle Management</span>
              </div>
            </div>
          </section>

          {/* Experience */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
              Career Experience
            </h2>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Customer Onboarding & AI Enablement Manager
                </h3>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  2024 – Present
                </span>
              </div>
              <p className="text-sm font-medium text-primary mb-3">
                Mews PMS | Prague, CZ (Remote)
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                <li>
                  Built an AI-powered reservation file converter using Lovable and Claude that fully automated a previously manual data migration process, saving Onboarding Managers and clients hours to days of effort per implementation.
                </li>
                <li>
                  Designed and delivered monthly system training to new Mews clients and new hires via MS Teams, translating complex software features into practical, accessible workflows for diverse enterprise audiences.
                </li>
                <li>
                  Reduced onboarding time by 20% by designing a structured onboarding program with standardized workflows, user manuals, and best-practice guides that improved self-service adoption and client confidence.
                </li>
                <li>
                  Successfully managed 10–20 enterprise customer accounts simultaneously, guiding each from initial configuration to live deployment within a 2–4 week cycle.
                </li>
                <li>
                  Integrated enterprise properties with key partner platforms — SiteMinder, Booking.com, Expedia, QuickBooks Online — ensuring seamless operational connectivity at go-live.
                </li>
                <li>
                  Managed a team of onboarding consultants, facilitating knowledge-sharing, troubleshooting escalations, and professional development to maintain consistent service delivery quality.
                </li>
                <li>
                  Built a Salesforce-to-Slack daily reporting tool using Claude that surfaces real-time project status for all assigned accounts, increasing management visibility and team accountability.
                </li>
                <li>
                  Built a project handover automation with Claude and Lovable that generates management-ready status reports, ensuring zero disruption during planned absences.
                </li>
              </ul>
            </div>

            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Training & Implementation Manager
                </h3>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  2018 – 2024
                </span>
              </div>
              <p className="text-sm font-medium text-primary mb-3">
                PurpleCloud Technologies | Atlanta, GA (Remote)
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                <li>
                  Cut training time by 60% (5 days → 2) and implementation time by 50% (2 months → 1 month) through redesigned onboarding curriculum and streamlined delivery processes.
                </li>
                <li>
                  Guided C-suite stakeholders through software adoption by identifying individual training needs, tailoring sessions, and connecting product capabilities to business objectives.
                </li>
                <li>
                  Led live webinars, on-site training sessions, and produced recorded instructional content using ScreenPal, ensuring flexible and scalable enablement across distributed enterprise teams.
                </li>
                <li>
                  Configured and integrated Property Management Systems (Opera, Maestro) to meet diverse customer environments, translating complex technical requirements into functional enterprise deployments.
                </li>
                <li>
                  Developed and maintained up-to-date training materials, client newsletters (Constant Contact), and product update communications to sustain engagement and adoption post-launch.
                </li>
                <li>
                  Documented client bugs, feature requests, and usability concerns in Zendesk and HubSpot, routing insights to engineering via Pivotal Tracker to inform product development.
                </li>
              </ul>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <h3 className="text-lg font-semibold text-foreground">
                  Systems Administrator & Senior Support Analyst
                </h3>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  2013 – 2018
                </span>
              </div>
              <p className="text-sm font-medium text-primary mb-3">
                Amadeus | Atlanta, GA
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground">
                <li>
                  Provided enterprise-level technical support and systems administration for Hotel SalesPro users across North America; recognized as a Top Performer in 2017 for resolving the second-highest number of support cases company-wide.
                </li>
                <li>
                  Led performance analyses and continuous improvement initiatives across the product support function, reducing employee downtime through proactive training and change management.
                </li>
                <li>
                  Managed hardware and software migrations — including legacy-to-new-platform transitions — with minimal business disruption.
                </li>
              </ul>
            </div>
          </section>

          {/* Projects */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Selected Projects
            </h2>
            <div className="space-y-4">
              {RESUME.projects.map((p) => {
                const body = (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
                      <span className="text-xs font-medium uppercase tracking-wider text-primary">{p.stack}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{p.outcome}</p>
                    {p.href && <p className="mt-1 text-xs text-primary">{p.href.replace(/^https?:\/\//, "")}</p>}
                  </>
                );
                return p.href ? (
                  <a key={p.title} href={p.href} target="_blank" rel="noreferrer" className="block rounded-md border border-border bg-card/50 p-4 hover:border-primary/60 transition-colors">
                    {body}
                  </a>
                ) : (
                  <div key={p.title} className="rounded-md border border-border bg-card/50 p-4">
                    {body}
                  </div>
                );
              })}
            </div>
          </section>


          {/* Additional Experience */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Additional Experience
            </h2>
            <div className="space-y-1 text-sm text-foreground">
              <p>
                <strong>Help Desk Support Analyst & Hardware Integration Specialist</strong> — Medquest Associates (Contractual), Alpharetta, GA
              </p>
              <p>
                <strong>Systems Administrator | Sales Support Representative & Point-of-Sales Specialist</strong> — PeopleNet, Inc., Atlanta, GA
              </p>
            </div>
          </section>

          {/* Technical Proficiencies */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              AI & Technical Proficiencies
            </h2>
            <div className="space-y-3 text-sm text-foreground">
              <p>
                <strong className="text-primary">AI & Automation:</strong> Claude (API / Claude Code), Lovable AI, ChatGPT, Glean AI, Chat & Ask AI, Power BI
              </p>
              <p>
                <strong className="text-primary">Customer Success & CRM:</strong> Salesforce, Gainsight, HubSpot, Zendesk, Gong, Clari Copilot, Jira, Confluence
              </p>
              <p>
                <strong className="text-primary">Training & Enablement:</strong> Talent LMS, Appcues, ScreenPal, Loom, Canva, SurveyMonkey, Constant Contact
              </p>
              <p>
                <strong className="text-primary">Collaboration & Project Management:</strong> Slack, MS Teams, Monday.com, Asana, Trello, Tallyfy, SharePoint, Confluence, WebEx
              </p>
            </div>
          </section>

          {/* Education */}
          <section className="mb-8">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Education
            </h2>
            <div className="text-sm text-foreground">
              <p className="font-semibold">Bachelor of Science in Business Management | GPA 3.6</p>
              <p className="text-muted-foreground">University of Phoenix | Atlanta, GA</p>
            </div>
          </section>

          {/* Certifications */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Certifications & Credentials
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-foreground">
              <li>• Mews PMS Onboarding Manager Certification</li>
              <li>• Value-First Onboarding — Appcues</li>
              <li>• Salesforce Training — Amadeus</li>
              <li>• CompTIA A+ Certification — Mercer University-ICTS</li>
              <li>• Public Key Infrastructure (PKI) Certification — Novartis Pharmaceuticals</li>
              <li>• Help Desk 2000/e&gt;Support Certification — STI Knowledge</li>
            </ul>
          </section>
        </article>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground print:hidden">
          <span>Last updated {RESUME.lastUpdated}</span>
          <span>
            Built by <a href="https://kenroecollective.com" className="text-primary hover:underline">The Kenroe Collective</a>
          </span>
        </footer>
      </div>
    </main>
  );
}

