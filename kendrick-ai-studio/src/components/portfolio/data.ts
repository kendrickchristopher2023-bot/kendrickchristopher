export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/christopherbkendrick/",
  github: "https://github.com/ckendrick24/ckendrick24",
};

export const EMAIL = "kendrickchristopher@hotmail.com";

export type ProjectStatus = "Live" | "In progress" | "Delivered" | "Early access";

export type Project = {
  title: string;
  description: string;
  tags: string[];
  live?: boolean;
  href?: string;
  flagship?: boolean;
  status?: ProjectStatus;
};

export const AI_PRODUCTS: Project[] = [
  {
    title: "Events and Gatherings",
    description:
      "Plan the whole event in one place: invitations, RSVPs, vendor coordination, and the full run of the evening, orchestrated with editorial care.",
    tags: ["React", "Supabase", "Lovable"],
    status: "Live",
  },
  {
    title: "Group eCards",
    description:
      "One card, one link, unlimited contributors. Everyone signs a shared group card that is revealed on the day. Live with paying customers.",
    tags: ["React", "Supabase", "Payments", "Stripe"],
    status: "Live",
  },
  {
    title: "The Workroom",
    description:
      "A production workspace with Kanban boards, tasks, and quiet accountability for work of every kind.",
    tags: ["React", "Supabase", "Lovable"],
    status: "Live",
  },
  {
    title: "AI Resume Wizard",
    description:
      "An AI job search companion for resumes, cover letters, and applications that land.",
    tags: ["AI", "React", "Stripe"],
    status: "Live",
  },
];

export const AI_AT_WORK_GROUPS: { title: string; projects: Project[] }[] = [
  {
    title: "Lovable Applications",
    projects: [
      {
        title: "Mews Call Companion",
        description:
          "A Lovable application that pulls Gong call transcripts and uses the Claude API to draft personalized pre go-live client follow up emails, cutting manual drafting across a portfolio of 18+ onboarding projects. Cataloged as an approved asset in the NA Onboarding AI Innovation Repository.",
        tags: ["Lovable", "Claude API", "Gong"],
        status: "Live",
        flagship: true,
      },
      {
        title: "Mews Handover Hub",
        description:
          "A second Lovable application to formalize the onboarding to customer success handover data. Build paused pending an SSO reauthentication on the Lovable workspace connector.",
        tags: ["Lovable"],
        status: "Live",
      },
    ],
  },
  {
    title: "Claude Automations and Agents",
    projects: [
      {
        title: "Daily Onboarding Health Check",
        description:
          "A scheduled Claude Code routine that runs every weekday, queries Salesforce for the full active portfolio, cross references genuine Outlook activity to filter out automated senders, scores every project against five risk rules, and delivers a single risk digest to Slack. Replaced manual daily portfolio review.",
        tags: ["Claude Code", "Salesforce", "Outlook", "Slack"],
        status: "Live",
      },
      {
        title: "Weekly Onboarding Report System",
        description:
          "A reusable Claude skill that pulls Go Live Support, Configuration, and On Hold data from Salesforce, cross checks against Databricks, applies pacing logic against a target, and outputs a formatted status report in Markdown and Word plus leadership talking points. Delivered weekly with no manual data pulling.",
        tags: ["Claude Skills", "Salesforce", "Databricks"],
        status: "Live",
      },
      {
        title: "On Hold Queue Dashboard",
        description:
          "A scheduled task and HTML dashboard tracking on hold portfolio aging, revenue parked, and restart candidates, with a weekly metric, comparison, reason, and next steps update sent to leadership.",
        tags: ["Automation", "HTML", "Slack"],
        status: "Live",
      },
      {
        title: "Daily Hygiene Dashboard",
        description:
          "A scheduled task and HTML dashboard covering portfolio KPIs and an onboarding cohort risk triage board, delivered automatically to Slack each morning.",
        tags: ["Automation", "HTML", "Slack"],
        status: "Live",
      },
      {
        title: "Onboarding Cohort Status Skill",
        description:
          "A standalone Claude skill that reviews all active cohorts across Activation, Configuration, and Go Live Support against Salesforce, and flags blockers and at risk projects for weekly standup use.",
        tags: ["Claude Skills", "Salesforce"],
        status: "Live",
      },
      {
        title: "Regional Onboarding Report",
        description:
          "A live report system with canonical Salesforce and Databricks data definitions for a defined regional book of business, delivered weekly as a Word document by email.",
        tags: ["Automation", "Salesforce", "Databricks"],
        status: "Live",
      },
      {
        title: "CLAUDE.md Context System",
        description:
          "A three tier context hierarchy, root, org, and per project, for Claude Code so role identity, tool ecosystem, pipeline data, and standing operational rules load automatically every session. Removes repeat context setting.",
        tags: ["Claude Code", "Prompt Engineering"],
        status: "Live",
      },
      {
        title: "Personal AI Coaching Dashboard",
        description:
          "Consolidated the prompts and tools from an eight station internal AI training program into one shareable HTML dashboard with search, one click copy, and a team contribution log. Built as the capstone for an internal AI training program.",
        tags: ["HTML", "Prompt Engineering"],
        status: "Delivered",
      },
      {
        title: "Flexkeeping Configuration Guide",
        description:
          "Converted a gated learning path into an eighteen page plain English Word and PDF guide covering the full setup workflow, a worked example, a common issues table, and a glossary, written for coworkers and clients with no hospitality or software background.",
        tags: ["Technical Writing", "Documentation"],
        status: "Delivered",
      },
      {
        title: "Training Completion Check Skill",
        description:
          "A Claude skill to pull training completion by account from Databricks tables. Currently blocked by a workspace level Databricks authentication migration.",
        tags: ["Claude Skills", "Databricks"],
        status: "Live",
      },
      {
        title: "AI Innovation Repository",
        description:
          "Documented and catalogued team built AI assets, including the Call Companion and onboarding dashboards, into a shared Confluence repository for cross team visibility and reuse.",
        tags: ["Documentation", "Knowledge Sharing"],
        status: "Delivered",
      },
    ],
  },
];

export const SKILL_GROUPS = [
  {
    title: "AI & LLM",
    items: ["Claude API", "Claude Code", "Prompt Engineering", "AI Agents", "Claude Skills", "RAG"],
  },
  {
    title: "Build & Frontend",
    items: ["Lovable", "React", "TypeScript", "Tailwind CSS", "shadcn/ui"],
  },
  {
    title: "Backend & Data",
    items: ["Supabase", "PostgreSQL", "Stripe", "Salesforce", "Databricks"],
  },
  {
    title: "Automation & Integrations",
    items: ["Slack", "Gong", "Outlook", "Scheduled Agents"],
  },
];

export const NAV_LINKS = [
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "resume", label: "Resume" },
  { id: "cover-letter", label: "Cover Letter" },
  { id: "contact", label: "Contact" },
];