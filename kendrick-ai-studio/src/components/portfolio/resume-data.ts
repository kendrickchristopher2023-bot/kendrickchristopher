export const RESUME_CONTACT = {
  name: "Christopher Kendrick",
  title: "Customer Onboarding and Implementation Manager",
  email: "kendrickchristopher@hotmail.com",
  phone: "(404) 358-0626",
  linkedin: "linkedin.com/in/christopherbkendrick",
  website: "christopherbkendrick.app",
  location: "Concord, NC",
};

export const RESUME_SUMMARY =
  "Onboarding and implementation leader who turns complex technical rollouts into smooth client adoption, and who builds AI-powered workflows to eliminate manual work and accelerate client success. I pair more than a decade of training, implementation, and onboarding experience with modern AI tooling to design, test, and ship tools that teams actually use, and I measure the work by real outcomes: faster onboarding, cleaner data, and fewer manual steps.";

export const RESUME_SKILLS = [
  "AI Workflow Automation",
  "Technical Client Onboarding",
  "Training Program Development",
  "PMS Implementation and Integrations",
  "Project Management",
  "User Adoption and User Experience Optimization",
  "Strategic Training Development",
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
      "Manage onboarding for 10 to 20 customer accounts at once, guiding clients on Mews software, guest billing, and system navigation, with transitions completed within 2 to 4 weeks.",
      "Reduced onboarding time by 20% by designing a structured onboarding program that streamlined workflows and improved the client experience.",
      "Lead technical implementation across data migration, system configuration, and integrations with partners including SiteMinder, Booking.com, Expedia, and QuickBooks Online.",
      "Designed, tested, and rolled out an AI-powered file conversion tool (Lovable and an AI vision model) that automatically transforms reservation imports into Mews-compatible formats, eliminating manual re-keying and reducing client implementation time by 2 to 5 days; adopted across the onboarding department in every country.",
      "Built a daily automated reporting agent in Claude that aggregates project status, timelines, and Salesforce links into a single Slack digest, cutting status-meeting overhead and giving the team real-time portfolio visibility.",
      "Created an AI coverage and handover system (Claude and Lovable) that reassigns a manager's onboarding projects during planned absences and sends the covering manager a Slack briefing plus real-time management reports, keeping account context and coverage intact.",
      "Architect additional AI tools and reports used daily by the Customer Success department, reducing implementation friction and improving team efficiency.",
      "Deliver monthly system training to new clients and new hires via MS Teams, and maintain onboarding documentation, user manuals, and best practice guides for client self-service.",
      "Manage a team of consultants to ensure timely, high-standard property implementation, and serve as the team Wellness Ambassador.",
    ],
  },
  {
    role: "Director of Training and Implementation",
    company: "PurpleCloud Technologies, Atlanta, GA (Remote)",
    dates: "2018 to 2024",
    bullets: [
      "Directed end-to-end implementation and training for new client projects across diverse hotel portfolios, providing ongoing post-launch support.",
      "Slashed training time by 60% (from five days to two) and cut implementation time in half (from two months to one) by re-engineering onboarding processes.",
      "Led training for executives, managers, and front-line staff through webinars, on-site sessions, and recorded materials.",
      "Standardized system configurations and integrations with PMS platforms including Opera and Maestro to meet customer requirements.",
      "Improved client engagement and software adoption using Appcues Builder, Constant Contact, ScreenPal, and SurveyMonkey, and documented bugs and user concerns in Zendesk, HubSpot, and Pivotal Tracker for timely resolution.",
    ],
  },
  {
    role: "Systems Administrator and Senior Support Analyst",
    company: "Amadeus, Atlanta, GA",
    dates: "2013 to 2018",
    bullets: [
      "Optimized product support for Hotel SalesPro Enterprise users across North America through performance analysis and continuous improvement.",
      "Managed hardware and software migrations, including the transition from legacy systems to Dell XPS laptops, streamlining purchasing and upgrade planning.",
      "Steered IT operations for the Atlanta office, maintaining hardware, software, servers, networks, and communication systems.",
      "Resolved technical issues in IDPMS and Brilliant PMPro, minimizing disruptions and improving reliability.",
      "Recognized as a 2017 Top Performer for resolving the second-highest number of cases company-wide.",
    ],
  },
];

export const RESUME_ADDITIONAL = [
  "Help Desk Support Analyst and Hardware Integration Specialist, Medquest Associates (Contractual), Alpharetta, GA",
  "Systems Administrator, Peoplenet, Inc., Atlanta, GA",
  "Sales Support Representative and Point-of-Sales Specialist, PeopleNet, Inc., Atlanta, GA",
];

export const RESUME_TECH = [
  {
    label: "AI and Automation",
    value: "Claude Code, Claude API, Lovable AI, Gemini, ChatGPT, Glean AI, Clari Copilot",
  },
  {
    label: "Data and Reporting",
    value: "Salesforce, Databricks, Power BI, Gainsight",
  },
  {
    label: "CRM and Support",
    value: "HubSpot, Zendesk, Talent LMS, Tallyfy",
  },
  {
    label: "Project Management",
    value: "Monday.com, Jira, Trello, Asana, Pivotal Tracker",
  },
  {
    label: "Communication and Enablement",
    value: "Slack, MS Teams, Gong, Confluence, Loom, Canva, ScreenPal, WebEx, Dialpad, Constant Contact",
  },
  {
    label: "PMS and Technical",
    value: "Mews, Opera, Maestro, IDPMS, Brilliant, Hotel SalesPro, GitHub, Active Directory, Citrix, Cisco Meraki, SharePoint",
  },
];

export const RESUME_EDUCATION =
  "Bachelor of Science in Business Management (GPA 3.6), University of Phoenix, Atlanta, GA";

export const RESUME_CERTIFICATIONS = [
  "AI Training Program, Mews, completed in full, top 3 percent of 270 participants (2026)",
  "Mews PMS Onboarding Manager Certification",
  "Value-First Onboarding (Appcues)",
  "Salesforce Training (Amadeus)",
  "Commercial Driver's License (Class A), X-Tanker and HazMat endorsements",
  "Public Key Infrastructure (PKI) Certification",
  "Help Desk 2000 Support Certification",
  "CompTIA A+ Certification",
];

export const COVER_LETTER_PARAGRAPHS = [
  "I build AI tools that ship and get used. Over the past year I have designed and deployed live applications and automations that replaced hours of manual work, from a Claude-powered tool that drafts personalized client follow-up emails to scheduled agents that pull data from Salesforce and Databricks and deliver risk digests and KPI dashboards to leadership every morning. I care less about AI as a buzzword and more about the measurable outcome: faster onboarding, cleaner data, and fewer manual steps for the people around me.",
  "That builder's mindset sits on top of more than a decade of experience leading technical onboarding, training, and software implementation in the hospitality technology space. At Mews, I orchestrate onboarding for 10 to 20 concurrent accounts and helped drive a 20 percent reduction in onboarding time and a 60 percent go-live rate in under 30 days by standardizing the delivery framework. Earlier, at PurpleCloud Technologies, I cut training time by 60 percent and accelerated implementation cycles by half. I know how to make complex software approachable for non-technical users, and I now use AI to do that at a scale I could not reach before.",
  "What I would bring to your team is a rare combination: someone who understands the customer and the onboarding journey deeply, and who can also build the tools to improve it. I move quickly with modern AI tooling like Claude Code, the Claude API, and Lovable, I document what I build so others can adopt it, and I hold myself to real impact rather than activity.",
  "I would welcome the chance to talk about how I can help your team ship better AI-driven experiences and onboarding outcomes. Thank you for your time and consideration.",
];
