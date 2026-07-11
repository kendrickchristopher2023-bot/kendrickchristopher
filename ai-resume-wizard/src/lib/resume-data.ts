// Master resume data — single source of truth used by the resume page,
// PDF regenerator, and AI tailor. Edit here, everything downstream updates.

export type ResumeExperience = {
  title: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
};

export type ResumeProject = {
  title: string;
  stack: string;
  outcome: string;
  href?: string;
  internal?: boolean;
  loomUrl?: string;
  repoUrl?: string;
};

export type MasterResume = {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  summary: string;
  competencies: string[];
  experience: ResumeExperience[];
  additionalExperience: string[];
  proficiencies: { label: string; value: string }[];
  education: { degree: string; school: string };
  certifications: string[];
  projects: ResumeProject[];
  lastUpdated: string;
};

export const RESUME: MasterResume = {
  name: "Christopher Kendrick",
  title: "AI Deployment & Enablement Manager",
  email: "kendrickchristopher@hotmail.com",
  phone: "(404) 358-0626",
  location: "Concord, NC | Open to relocation – New York, NY",
  github: "github.com/christopherkendrick",
  linkedin: "linkedin.com/in/christopherkendrick",
  summary:
    "Results-driven AI deployment and customer enablement specialist with 10+ years designing and delivering programs that accelerate product adoption across enterprise organizations. Proven track record translating complex technical capabilities — including AI-powered tools — into accessible, high-impact learning experiences for audiences from front-line employees to C-suite executives. Hands-on builder of AI automation solutions using Claude, Lovable AI, and ChatGPT. Experienced leading cross-functional implementation teams, managing concurrent enterprise accounts, and developing scalable enablement playbooks that drive measurable business outcomes.",
  competencies: [
    "AI Product Enablement",
    "Enterprise Onboarding & Adoption",
    "Instructional Design",
    "Executive Stakeholder Engagement",
    "AI Tool Development (Claude / Lovable)",
    "Change Management",
    "Scalable Playbook Development",
    "Workshop Design & Facilitation",
    "Cross-functional Team Leadership",
    "KPI Monitoring & Optimization",
    "Technical Implementation",
    "Customer Lifecycle Management",
  ],
  experience: [
    {
      title: "Customer Onboarding & AI Enablement Manager",
      company: "Mews PMS",
      location: "Prague, CZ (Remote)",
      dates: "2024 – Present",
      bullets: [
        "Built an AI-powered reservation file converter using Lovable and Claude that fully automated a previously manual data migration process, saving Onboarding Managers and clients hours to days of effort per implementation.",
        "Designed and delivered monthly system training to new Mews clients and new hires via MS Teams, translating complex software features into practical, accessible workflows for diverse enterprise audiences.",
        "Reduced onboarding time by 20% by designing a structured onboarding program with standardized workflows, user manuals, and best-practice guides that improved self-service adoption and client confidence.",
        "Successfully managed 10–20 enterprise customer accounts simultaneously, guiding each from initial configuration to live deployment within a 2–4 week cycle.",
        "Integrated enterprise properties with key partner platforms — SiteMinder, Booking.com, Expedia, QuickBooks Online — ensuring seamless operational connectivity at go-live.",
        "Managed a team of onboarding consultants, facilitating knowledge-sharing, troubleshooting escalations, and professional development to maintain consistent service delivery quality.",
        "Built a Salesforce-to-Slack daily reporting tool using Claude that surfaces real-time project status for all assigned accounts, increasing management visibility and team accountability.",
        "Built a project handover automation with Claude and Lovable that generates management-ready status reports, ensuring zero disruption during planned absences.",
      ],
    },
    {
      title: "Training & Implementation Manager",
      company: "PurpleCloud Technologies",
      location: "Atlanta, GA (Remote)",
      dates: "2018 – 2024",
      bullets: [
        "Cut training time by 60% (5 days → 2) and implementation time by 50% (2 months → 1 month) through redesigned onboarding curriculum and streamlined delivery processes.",
        "Guided C-suite stakeholders through software adoption by identifying individual training needs, tailoring sessions, and connecting product capabilities to business objectives.",
        "Led live webinars, on-site training sessions, and produced recorded instructional content using ScreenPal, ensuring flexible and scalable enablement across distributed enterprise teams.",
        "Configured and integrated Property Management Systems (Opera, Maestro) to meet diverse customer environments, translating complex technical requirements into functional enterprise deployments.",
        "Developed and maintained up-to-date training materials, client newsletters (Constant Contact), and product update communications to sustain engagement and adoption post-launch.",
        "Documented client bugs, feature requests, and usability concerns in Zendesk and HubSpot, routing insights to engineering via Pivotal Tracker to inform product development.",
      ],
    },
    {
      title: "Systems Administrator & Senior Support Analyst",
      company: "Amadeus",
      location: "Atlanta, GA",
      dates: "2013 – 2018",
      bullets: [
        "Provided enterprise-level technical support and systems administration for Hotel SalesPro users across North America; recognized as Top Performer in 2017 for resolving the second-highest number of support cases company-wide.",
        "Led performance analyses and continuous improvement initiatives across the product support function, reducing employee downtime through proactive training and change management.",
        "Managed hardware and software migrations — including legacy-to-new-platform transitions — with minimal business disruption.",
      ],
    },
  ],
  additionalExperience: [
    "Help Desk Support Analyst & Hardware Integration Specialist — Medquest Associates (Contractual), Alpharetta, GA",
    "Systems Administrator | Sales Support Representative & Point-of-Sales Specialist — PeopleNet, Inc., Atlanta, GA",
  ],
  proficiencies: [
    { label: "AI & Automation", value: "Claude (API / Claude Code), Lovable AI, ChatGPT, Glean AI, Chat & Ask AI, Power BI" },
    { label: "Customer Success & CRM", value: "Salesforce, Gainsight, HubSpot, Zendesk, Gong, Clari Copilot, Jira, Confluence" },
    { label: "Training & Enablement", value: "Talent LMS, Appcues, ScreenPal, Loom, Canva, SurveyMonkey, Constant Contact" },
    { label: "Collaboration & PM", value: "Slack, MS Teams, Monday.com, Asana, Trello, Tallyfy, SharePoint, WebEx" },
  ],
  education: {
    degree: "Bachelor of Science in Business Management | GPA 3.6",
    school: "University of Phoenix | Atlanta, GA",
  },
  certifications: [
    "Mews PMS Onboarding Manager Certification",
    "Value-First Onboarding — Appcues",
    "Salesforce Training — Amadeus",
    "CompTIA A+ Certification — Mercer University-ICTS",
    "Public Key Infrastructure (PKI) Certification — Novartis Pharmaceuticals",
    "Help Desk 2000/e>Support Certification — STI Knowledge",
  ],
  projects: [
    {
      title: "Reservation File Converter",
      stack: "Lovable + Claude",
      outcome:
        "Eliminated a manual data-migration step for every enterprise hotel go-live at Mews. Ingests any reservation format, outputs Mews-ready CSV in one click.",
    },
    {
      title: "Salesforce → Slack Reporting Agent",
      stack: "Claude API",
      outcome:
        "Daily digest of 10–20 concurrent enterprise deployments posted to leadership Slack. Gave management live account visibility without new meetings.",
    },
    {
      title: "AI Handover Generator",
      stack: "Claude + Lovable",
      outcome:
        "Generates management-ready handover reports from account data on demand. Zero disruption during PTO across active enterprise deployments.",
    },
    {
      title: "The Kenroe Collective",
      stack: "Consulting practice",
      outcome:
        "Advisory work on AI deployment and internal-tooling for enterprise teams. Positioning shop and launchpad for the automations above.",
      href: "https://kenroecollective.com",
    },
    {
      title: "This site (Resume + Application Kit)",
      stack: "TanStack Start + Lovable AI + pdf-lib",
      outcome:
        "The page you're reading. Built with the exact stack I'd deploy for your customers — AI resume tailor, PDF regeneration, and job-match dashboard included.",
      internal: true,
    },
  ],
  lastUpdated: "July 11, 2026",
};
