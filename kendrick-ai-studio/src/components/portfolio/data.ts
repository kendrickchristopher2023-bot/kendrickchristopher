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
  flow?: string[];
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
    status: "Early access",
  },
];

export const AI_AT_WORK_GROUPS: { title: string; projects: Project[] }[] = [
  {
    title: "Lovable Applications",
    projects: [
      {
        title: "Mews Call Companion",
        description:
          "A live Lovable application that turns Gong call transcripts into personalized pre go-live client follow up emails with the Claude API, summarizing discussion points, action items, and client specific needs, and cutting manual drafting across an active onboarding portfolio. Cataloged as an approved asset in the NA Onboarding AI Innovation Repository.",
        tags: ["Lovable", "Claude API", "Gong"],
        status: "Live",
        flagship: true,
        flow: ["Gong call transcript", "Claude API", "Personalized follow-up email"],
      },
      {
        title: "Mews Reservation Import Converter",
        description:
          "An AI powered file conversion tool that transforms messy reservation exports, Excel, CSV, text and scanned PDFs, screenshots, even phone photos of printed reports, into clean, Mews ready import files. Spreadsheets parse in the browser while images and scans run through an AI vision model for row extraction, then the user maps columns, reviews low confidence values, and downloads the finished file. Removes manual re-keying from property data migration and cuts the onboarding timeline by 2 to 5 days per client. Adopted across the onboarding department in every country.",
        tags: ["Lovable", "AI Vision", "Gemini"],
        status: "Live",
        flow: ["Messy export or photo", "AI vision extraction", "Map and review columns", "Clean Mews import file"],
      },
      {
        title: "HMS Knowledge Hub",
        description:
          "A live internal AI support tool whose original knowledge base returned unreliable, sometimes invented answers. Rebuilt it from authoritative company sources into 100 question and answer entries across ten categories, 8 how-to guides, and 32 glossary terms, drawn from Confluence, the Mews Help Center, Slack, the Jira operations queue, and patterns from Gong calls. Every entry carries a source, a last verified date, and a confidence flag, and was pushed straight into the live app to replace the old seed data.",
        tags: ["Lovable", "Confluence", "Jira", "Gong"],
        status: "Live",
        flow: ["Confluence, Slack, Jira, Gong", "Curated Q&A with confidence flags", "Live in-app answers"],
      },
      {
        title: "Onboarding Team Guide",
        description:
          "A full stack internal team application with email magic-link sign in and role based access enforced through Supabase row level security at the database level, not just page routing, restricted to a named allowlist of 11 team members plus a manager. Turns raw team meeting notes into a living, inline editable workspace: five tracked problem areas, an anonymous feedback wall with no author field even in the database, per item status and ownership, and threaded notes.",
        tags: ["Lovable", "Supabase", "Auth"],
        status: "Live",
      },
      {
        title: "Mews Handover Hub",
        description:
          "A Lovable application that keeps onboarding projects covered when a manager is out. It reassigns a departing manager's active projects, sends the covering manager a Slack briefing with the account context they need, and gives leadership a real-time view of who owns what, so ownership and continuity hold through planned absences.",
        tags: ["Lovable"],
        status: "Live",
        flow: ["Manager goes on leave", "Projects reassigned", "Slack briefing to covering manager", "Real-time management report"],
      },
    ],
  },
  {
    title: "Automations, Agents & Skills",
    projects: [
      {
        title: "Daily Onboarding Health Check",
        description:
          "A scheduled Claude Code routine that runs every weekday, pulls the full active Salesforce portfolio, checks Outlook for genuine recent activity while filtering out automated senders, scores every project against a five rule risk model, and delivers one risk digest to Slack. Replaced a manual daily portfolio review done by hand every morning.",
        tags: ["Claude Code", "Salesforce", "Outlook", "Slack"],
        status: "Live",
        flow: ["Salesforce and Outlook", "Five-rule risk scoring", "Daily Slack digest"],
      },
      {
        title: "Weekly Onboarding Report Skill",
        description:
          "A reusable Claude skill that pulls Configuration, Go Live Support, and On Hold data from Salesforce, cross checks it against Databricks, applies pacing logic against the under 30 days go-live target, and outputs a formatted weekly status report in Markdown and Word plus leadership talking points, with no manual data pulling.",
        tags: ["Claude Skills", "Salesforce", "Databricks"],
        status: "Live",
        flow: ["Salesforce and Databricks", "Pacing logic vs target", "Markdown and Word report"],
      },
      {
        title: "Salesforce and Databricks Reporting Agent",
        description:
          "A persistent Claude agent with standing project memory that cross checks Salesforce and Databricks, generates on-hold and active deal reports, drafts client emails, and exports clean HTML for quick reference, without re-establishing context each session. Cataloged internally under Single Source of Truth.",
        tags: ["Claude Projects", "Salesforce", "Databricks"],
        status: "Live",
      },
      {
        title: "On Hold PMS Queue Dashboard",
        description:
          "A live dashboard for the North America and LAC on-hold onboarding queue that tracks parked ARR, restart pipeline by quarter, and aging and churn risk, cross checking Salesforce and Databricks and flagging mismatches between the two sources.",
        tags: ["Cowork", "Salesforce", "Databricks"],
        status: "Live",
      },
      {
        title: "Regional Onboarding Report",
        description:
          "A scheduled reporting system that emails a formatted regional onboarding portfolio report every week, covering pipeline, on-hold and blocked counts, tier and country splits, and monthly business review numbers, assembled automatically from Salesforce and Databricks.",
        tags: ["Cowork", "Salesforce", "Databricks", "Outlook"],
        status: "Live",
      },
      {
        title: "One-on-One Manager Co-Pilot",
        description:
          "An automated briefing workflow that prepares one-on-one meeting notes ahead of each meeting by pulling portfolio and Databricks metrics, recent Slack activity, Gong call history, and Confluence notes into a single summary, removing manual prep before every one-on-one.",
        tags: ["Cowork", "Databricks", "Slack", "Gong", "Confluence"],
        status: "Live",
        flow: ["Databricks, Slack, Gong, Confluence", "Automated synthesis", "One-page briefing"],
      },
      {
        title: "Manager Review Dashboard",
        description:
          "A React dashboard for recurring manager portfolio reviews that tracks active project confidence levels, flags any active project missing a go-live date, and documents on-hold restart expectations. Debugged a recurring input focus bug during the build by isolating project data outside the component, memoizing rows, and moving local saves onto blur instead of each keystroke.",
        tags: ["React", "Salesforce"],
        status: "Live",
      },
      {
        title: "CLAUDE.md Context System",
        description:
          "A three tier context system for Claude Code, root, organization, and project level, so role identity, tool access, pipeline data, and standing operational rules load automatically every session instead of being re-explained each time.",
        tags: ["Claude Code", "Prompt Engineering"],
        status: "Live",
      },
      {
        title: "Onboarding Cohort Status Skill",
        description:
          "A standalone Claude skill that reviews every active onboarding cohort across Activation, Configuration, and Go Live Support against Salesforce and flags blockers and at-risk projects for the weekly standup.",
        tags: ["Claude Skills", "Salesforce"],
        status: "Live",
      },
      {
        title: "Personal Writing Voice Skill",
        description:
          "A reusable Claude skill built by analyzing more than 140 of my own written messages across DMs, team channels, and project threads to capture greeting style, message length, emoji use, and how tone shifts by audience, used since to keep AI drafted messages consistent with my own voice.",
        tags: ["Claude Skills"],
        status: "Live",
      },
    ],
  },
  {
    title: "Guides & Enablement",
    projects: [
      {
        title: "Flexkeeping Configuration Guide",
        description:
          "An eighteen page plain English Word and PDF guide converted from a gated Mews University learning path: what Flexkeeping is, a full setup walkthrough across ten configuration areas, a worked example following one room through a full cycle, a common issues table, and a glossary. Written for coworkers and clients with no hospitality or software background.",
        tags: ["Word", "PDF", "Technical Writing"],
        status: "Delivered",
      },
      {
        title: "Personal AI Coaching Dashboard",
        description:
          "A shareable HTML dashboard that consolidates the prompts and tools from an eight station internal AI training program, with search, one-click copy, and a team contribution log. Built as the capstone for an internal CX AI training program.",
        tags: ["HTML"],
        status: "Delivered",
      },
      {
        title: "AI Innovation Repository",
        description:
          "An ongoing effort documenting and cataloging my own and teammates' AI built assets into a shared Confluence repository, giving the wider team a single place to find and reuse internal tools.",
        tags: ["Confluence", "Knowledge Sharing"],
        status: "Live",
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