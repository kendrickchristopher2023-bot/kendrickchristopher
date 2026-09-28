# Kendrick AI Studio

Build a personal portfolio website for Christopher Kendrick, an AI builder who ships real AI-powered products end to end. The audience is hiring managers and recruiters, so it needs to look polished, credible, and modern.

VISUAL STYLE: Modern dark theme with tasteful accent gradients (think deep near-black background with vibrant blue-to-purple or violet-to-cyan gradient highlights on headings, buttons, and cards). Smooth, professional, lots of contrast and whitespace. Subtle animations on scroll and hover. Fully responsive (great on mobile). Use a clean modern sans-serif font. Important: do NOT use em dashes anywhere in the copy; use commas or periods instead.

SITE STRUCTURE (single-page scroll with a sticky nav that links to each section):

1) HERO
- Name: Christopher Kendrick
- Headline: "I build AI products that ship." (or similar)
- Subheadline: Something like "Full-stack AI builder shipping live products with Lovable, the Claude API, and Claude Code. From customer-facing SaaS to internal automation that runs every day."
- Two buttons: "See my work" (scrolls to projects) and "Get in touch" (scrolls to contact).
- Tasteful animated gradient background element.

2) ABOUT (short)
- A few sentences: Christopher designs and ships AI-powered applications and automations end to end. He works across the full stack, from customer-facing products with authentication, databases, and payments, to scheduled AI agents that pull from Salesforce, Databricks, and Slack to replace hours of manual work. He builds fast with modern AI tooling and cares about real, measurable impact.

3) FEATURED PROJECTS
Two groups with subheadings.

GROUP A: "AI Products" (personal / customer-facing)
Cards, each with a title, short description, tech tags, and a "Live" badge where noted:
- Kenroe Collective — A full-stack platform with vendor and RFQ workflows, authentication, and a Supabase/PostgreSQL backend. Tags: React, Supabase, Stripe, Lovable. Badge: Live.
- Kenroe eCards — A group eCard product (Thankbox-style) live with paying customers. Contributors pool messages into a shared card. Tags: React, Supabase, Payments. Badge: Live.
- AI Resume Wizard — An AI-powered resume builder that helps users generate and refine resumes, with a paid export flow. Tags: AI, React, Stripe. Badge: Live.

GROUP B: "AI at Work" (professional AI engineering at Mews, a hospitality technology company)
- Mews Call Companion — Flagship. A live Lovable application that pulls Gong call transcripts and uses the Claude API to draft personalized pre go-live client follow-up emails, cutting manual drafting across a portfolio of 18+ onboarding projects. Cataloged as an approved asset in the internal AI Innovation Repository. Tags: Lovable, Claude API, Gong. Badge: Live. Link: https://mews-call-companion.lovable.app
- Onboarding Automation Suite — A set of scheduled Claude agents and dashboards that run automatically: a weekday risk digest that queries Salesforce and cross-references real Outlook activity to score every project against risk rules and posts to Slack; a weekly onboarding report pulling from Salesforce and Databricks into formatted Markdown and Word; and HTML KPI dashboards delivered to leadership each morning. Replaced hours of manual portfolio review. Tags: Claude Code, Salesforce, Databricks, Slack.
- Context Engineering System — A three-tier CLAUDE.md context hierarchy (root, org, and per-project) so an AI coding agent loads role identity, tooling, and operational rules automatically every session. Tags: Claude Code, Prompt Engineering.
- Reusable AI Skills — Packaged, reusable Claude skills for recurring reporting workflows (cohort status reviews, weekly pipeline reports) that pull live data and output leadership-ready documents. Tags: Claude Skills, Automation.

4) SKILLS & TOOLS
A clean grid or tag cloud grouped into categories:
- AI & LLM: Claude API, Claude Code, Prompt Engineering, AI Agents, Claude Skills, RAG
- Build & Frontend: Lovable, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend & Data: Supabase, PostgreSQL, Stripe, Salesforce, Databricks
- Automation & Integrations: Slack, Gong, Outlook, Scheduled Agents

5) CONTACT
- A working contact form with fields: Name, Email, Message, and a Send button. On submit, save the submission to the backend database (a contact_submissions table) and show a friendly success confirmation. Validate inputs.
- Also display the email address christopher's email: kendrickchristopher@hotmail.com as a mailto link for people who prefer email.
- Note: set up the form to store submissions now; email delivery/notifications can be wired up later.

6) FOOTER
- Small footer with name, a short tagline, and the current year.

Add smooth scroll behavior, a subtle scroll-to-top, and good SEO meta tags (title "Christopher Kendrick — AI Builder", description about shipping AI products). Make sure the whole thing feels premium and would impress a hiring manager at first glance. Leave placeholders that are easy to edit for LinkedIn and GitHub links in the nav/footer (I will add the URLs later).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://christopher-kendrick.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3ebfc2b2-b665-4e80-aa63-604fbc8b924f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
