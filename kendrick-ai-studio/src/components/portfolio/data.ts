export const SOCIAL_LINKS = {
  linkedin: "https://www.linkedin.com/in/christopherbkendrick/",
};

export const EMAIL = "kendrickchristopher@hotmail.com";

export type Project = {
  title: string;
  description: string;
  tags: string[];
  live?: boolean;
  href?: string;
  flagship?: boolean;
};

export const AI_PRODUCTS: Project[] = [
  {
    title: "Kenroe Collective",
    description:
      "A full stack platform with vendor and RFQ workflows, authentication, and a Supabase and PostgreSQL backend.",
    tags: ["React", "Supabase", "Stripe", "Lovable"],
    live: true,
  },
  {
    title: "Kenroe eCards",
    description:
      "A group eCard product, Thankbox style, live with paying customers. Contributors pool messages into a shared card.",
    tags: ["React", "Supabase", "Payments"],
    live: true,
  },
  {
    title: "AI Resume Wizard",
    description:
      "An AI powered resume builder that helps users generate and refine resumes, with a paid export flow.",
    tags: ["AI", "React", "Stripe"],
    live: true,
  },
];

export const AI_AT_WORK: Project[] = [
  {
    title: "Mews Call Companion",
    description:
      "A live Lovable application that pulls Gong call transcripts and uses the Claude API to draft personalized pre go-live client follow up emails, cutting manual drafting across a portfolio of 18+ onboarding projects. Cataloged as an approved asset in the internal AI Innovation Repository.",
    tags: ["Lovable", "Claude API", "Gong"],
    live: true,
    flagship: true,
  },
  {
    title: "Onboarding Automation Suite",
    description:
      "A set of scheduled Claude agents and dashboards that run automatically: a weekday risk digest that queries Salesforce and cross references real Outlook activity to score every project against risk rules and posts to Slack, a weekly onboarding report pulling from Salesforce and Databricks into formatted Markdown and Word, and HTML KPI dashboards delivered to leadership each morning. Replaced hours of manual portfolio review.",
    tags: ["Claude Code", "Salesforce", "Databricks", "Slack"],
  },
  {
    title: "Context Engineering System",
    description:
      "A three tier CLAUDE.md context hierarchy, root, org, and per project, so an AI coding agent loads role identity, tooling, and operational rules automatically every session.",
    tags: ["Claude Code", "Prompt Engineering"],
  },
  {
    title: "Reusable AI Skills",
    description:
      "Packaged, reusable Claude skills for recurring reporting workflows, cohort status reviews and weekly pipeline reports, that pull live data and output leadership ready documents.",
    tags: ["Claude Skills", "Automation"],
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