export const RESUME_CONTACT = {
  name: "Christopher Kendrick",
  title: "Training and Onboarding Manager",
  email: "kendrickchristopher@hotmail.com",
  phone: "(404) 358-0626",
  linkedin: "linkedin.com/in/christopherbkendrick",
  location: "Concord, NC",
};

export const RESUME_SUMMARY =
  "Results-driven Training and Onboarding Manager with specialized expertise in Property Management Systems (PMS) and large-scale software implementations. Proven track record in architecting structured onboarding frameworks that accelerate system adoption and simplify complex technical workflows. Expert in leveraging AI-driven automation to optimize client lifecycles, improve data integrity, and enhance the end-user learning experience.";

export const RESUME_SKILLS = [
  "AI Workflow Automation",
  "Technical Client Onboarding",
  "Strategic Training Development",
  "PMS Implementation and Integration",
  "Portfolio Risk Management",
  "Cross-Functional Team Leadership",
  "User Adoption Optimization",
  "Data-Driven Performance Analysis",
  "Technical Documentation and Technical Writing",
];

export type ResumeRole = {
  role: string;
  company: string;
  dates: string;
  bullets: string[];
};

export const RESUME_EXPERIENCE: ResumeRole[] = [
  {
    role: "Customer Onboarding Manager",
    company: "Mews PMS (Remote)",
    dates: "2024 to Present",
    bullets: [
      "Orchestrate complex onboarding cycles for 10 to 20 concurrent accounts, directing training on Mews PMS navigation, guest billing, and financial reporting.",
      "Drove a 20% reduction in onboarding duration, achieving a 60% go-live rate in under 30 days through the implementation of a structured delivery framework.",
      "Configure mission-critical integrations with global partners including SiteMinder, Booking.com, Expedia, and QuickBooks Online.",
      "Architected a three-tier context hierarchy for Claude Code (root, org, and project levels) to automate operational rule loading and standardize tool ecosystems.",
      "Deployed an AI-powered Daily Hygiene Dashboard and On-Hold Queue Dashboard to track ARR, aging projects, and portfolio KPIs for leadership visibility.",
      "Authoritative contributor to the NA Onboarding AI Innovation Repository, documenting internal AI tools for cross-functional team adoption.",
      "Authored an 18-page plain-English Flexkeeping Configuration Guide, translating complex learning paths into accessible documentation for non-technical users.",
      "Oversee a team of consultants to ensure rigorous property implementation standards and continuous process optimization.",
      "Created and deployed additional AI tools and reports used daily by the Customer Success department.",
    ],
  },
  {
    role: "Training and Implementation Manager",
    company: "PurpleCloud Technologies, Atlanta, GA (Remote)",
    dates: "2018 to 2024",
    bullets: [
      "Directed end-to-end software implementation and staff training for diverse hospitality portfolios, ensuring sustained post-launch support.",
      "Achieved a 60% reduction in training time (from 5 days to 2) and accelerated implementation cycles by 50% through process re-engineering.",
      "Delivered high-impact training programs for executive stakeholders and front-line staff via multi-channel delivery methods.",
      "Standardized system configurations and managed complex integrations with industry-standard PMS platforms including Opera and Maestro.",
      "Utilized Appcues Builder and performance analytics tools to identify and resolve user friction points, increasing software adoption rates.",
    ],
  },
  {
    role: "Systems Administrator and Senior Support Analyst",
    company: "Amadeus, Atlanta, GA",
    dates: "2013 to 2018",
    bullets: [
      "Optimized technical support operations for Hotel SalesPro Enterprise users across the North American market.",
      "Directed comprehensive hardware and software migrations, including large-scale fleet deployments of Dell XPS systems.",
      "Managed regional IT infrastructure, overseeing servers, network security, and internal communication systems.",
      "Provided expert-level troubleshooting for IDPMS and Brilliant PMPro software environments.",
      "Awarded 2017 Top Performer distinction for the second-highest case resolution volume across the enterprise.",
    ],
  },
];

export const RESUME_ADDITIONAL = [
  "Help Desk Support Analyst and Hardware Integration Specialist, Medquest Associates, Alpharetta, GA",
  "Systems Administrator, Peoplenet, Inc., Atlanta, GA",
  "Sales Support Representative and Point-of-Sales Specialist, PeopleNet, Inc., Atlanta, GA",
];

export const RESUME_TECH = [
  {
    label: "AI and Automation",
    value: "Claude Code, Lovable AI, Claude API, ChatGPT, Gemini, Glean AI, Clari Copilot",
  },
  {
    label: "LMS and CRM",
    value: "Salesforce, Databricks, Talent LMS, HubSpot, Zendesk, Gainsight",
  },
  {
    label: "Project Management",
    value: "Monday.com, Jira, Trello, Asana, Pivotal Tracker",
  },
  {
    label: "Communications",
    value: "Slack, MS Teams, Gong, Constant Contact, WebEx, Dialpad",
  },
  {
    label: "PMS and Technical",
    value: "Mews, Opera, Maestro, IDPMS, Brilliant, GitHub, Active Directory, Citrix, Cisco Meraki",
  },
];

export const RESUME_EDUCATION =
  "Bachelor of Science in Business Management (GPA 3.6), University of Phoenix, Atlanta, GA";

export const RESUME_CERTIFICATIONS = [
  "Mews PMS Onboarding Manager Certification",
  "Value-First Onboarding (Appcues)",
  "Salesforce Training (Amadeus)",
  "Commercial Driver's License (Class A)",
  "Public Key Infrastructure (PKI) Certification",
  "Help Desk 2000/Support Certification",
  "CompTIA A+ Certification",
];

export const COVER_LETTER_PARAGRAPHS = [
  "I build AI tools that ship and get used. Over the past year I have designed and deployed live applications and automations that replaced hours of manual work, from a Claude-powered tool that drafts personalized client follow-up emails to scheduled agents that pull data from Salesforce and Databricks and deliver risk digests and KPI dashboards to leadership every morning. I care less about AI as a buzzword and more about the measurable outcome: faster onboarding, cleaner data, and fewer manual steps for the people around me.",
  "That builder's mindset sits on top of more than a decade of experience leading technical onboarding, training, and software implementation in the hospitality technology space. At Mews, I orchestrate onboarding for 10 to 20 concurrent accounts and helped drive a 20 percent reduction in onboarding time and a 60 percent go-live rate in under 30 days by standardizing the delivery framework. Earlier, at PurpleCloud Technologies, I cut training time by 60 percent and accelerated implementation cycles by half. I know how to make complex software approachable for non-technical users, and I now use AI to do that at a scale I could not reach before.",
  "What I would bring to your team is a rare combination: someone who understands the customer and the onboarding journey deeply, and who can also build the tools to improve it. I move quickly with modern AI tooling like Claude Code, the Claude API, and Lovable, I document what I build so others can adopt it, and I hold myself to real impact rather than activity.",
  "I would welcome the chance to talk about how I can help your team ship better AI-driven experiences and onboarding outcomes. Thank you for your time and consideration.",
];