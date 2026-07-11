import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/apply/matches")({
  head: () => ({
    meta: [
      { title: "Job Matches — Christopher Kendrick" },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap",
      },
    ],
  }),
  component: MatchesPage,
});

type Match = {
  company: string;
  role: string;
  location: string;
  category: "Deployment" | "Forward Deployed" | "Solutions" | "Customer Eng" | "Implementation" | "AI PM" | "AI Ops";
  roleUrl: string; // deep link to the role or filtered search
  careers: string; // company careers home
};

// Focus: Charlotte metro AI/ML roles + remote-first AI companies. Role links
// deep-link to the specific opening or a keyword-filtered search on the
// company's ATS. Refreshed 2026-07.
const MATCHES: Match[] = [
  // ─── Charlotte metro ────────────────────────────────────────────────
  { company: "Bank of America", role: "AI / GenAI Solutions Lead", location: "Charlotte, NC", category: "Solutions", roleUrl: "https://careers.bankofamerica.com/en-us/search-results?keywords=AI&location=Charlotte", careers: "https://careers.bankofamerica.com/" },
  { company: "Bank of America", role: "AI Product Manager", location: "Charlotte, NC", category: "AI PM", roleUrl: "https://careers.bankofamerica.com/en-us/search-results?keywords=AI%20product%20manager&location=Charlotte", careers: "https://careers.bankofamerica.com/" },
  { company: "Lowe's", role: "AI / ML Product Manager", location: "Charlotte, NC (Tech Hub)", category: "AI PM", roleUrl: "https://talent.lowes.com/us/en/search-results?keywords=AI", careers: "https://talent.lowes.com/" },
  { company: "Lowe's", role: "GenAI Solutions Engineer", location: "Charlotte, NC", category: "Solutions", roleUrl: "https://talent.lowes.com/us/en/search-results?keywords=generative%20AI", careers: "https://talent.lowes.com/" },
  { company: "Honeywell", role: "AI Solutions Architect", location: "Charlotte, NC (HQ)", category: "Solutions", roleUrl: "https://careers.honeywell.com/us/en/search-results?keywords=AI&location=Charlotte", careers: "https://careers.honeywell.com/" },
  { company: "Duke Energy", role: "AI / Data Product Manager", location: "Charlotte, NC (HQ)", category: "AI PM", roleUrl: "https://jobs.duke-energy.com/search/?q=AI&locationsearch=Charlotte", careers: "https://jobs.duke-energy.com/" },
  { company: "Truist", role: "AI Deployment / Enablement", location: "Charlotte, NC", category: "Deployment", roleUrl: "https://careers.truist.com/us/en/search-results?keywords=AI&location=Charlotte", careers: "https://careers.truist.com/" },
  { company: "LPL Financial", role: "AI Solutions / Automation", location: "Fort Mill, SC (Charlotte metro)", category: "AI Ops", roleUrl: "https://careers.lpl.com/jobs/search?query=AI", careers: "https://careers.lpl.com/" },
  { company: "Ally Financial", role: "AI / ML Product Manager", location: "Charlotte, NC", category: "AI PM", roleUrl: "https://www.ally.com/careers/search-jobs/?keywords=AI&location=Charlotte", careers: "https://www.ally.com/careers/" },
  { company: "Red Ventures", role: "AI Solutions / Applied AI", location: "Fort Mill, SC (Charlotte metro)", category: "Solutions", roleUrl: "https://www.redventures.com/careers", careers: "https://www.redventures.com/careers" },
  { company: "AvidXchange", role: "AI Product / Automation Lead", location: "Charlotte, NC (HQ)", category: "AI PM", roleUrl: "https://www.avidxchange.com/careers/", careers: "https://www.avidxchange.com/careers/" },
  { company: "Wells Fargo", role: "GenAI Solutions Consultant", location: "Charlotte, NC", category: "Solutions", roleUrl: "https://www.wellsfargojobs.com/en/search-jobs/AI/Charlotte", careers: "https://www.wellsfargojobs.com/" },
  { company: "MetLife", role: "AI Implementation Manager", location: "Charlotte, NC", category: "Implementation", roleUrl: "https://careers.metlife.com/global/en/search-results?keywords=AI&location=Charlotte", careers: "https://careers.metlife.com/" },
  { company: "Ansys", role: "AI Solutions Engineer", location: "Charlotte, NC / Remote", category: "Solutions", roleUrl: "https://careers.ansys.com/jobs?search=AI", careers: "https://careers.ansys.com/" },

  // ─── Remote-first frontier / applied AI ─────────────────────────────
  { company: "Anthropic", role: "Applied AI, Enterprise", location: "Remote (US)", category: "Solutions", roleUrl: "https://www.anthropic.com/jobs?team=applied-ai", careers: "https://www.anthropic.com/careers" },
  { company: "Anthropic", role: "Customer Engineer", location: "Remote (US)", category: "Customer Eng", roleUrl: "https://www.anthropic.com/jobs?team=go-to-market", careers: "https://www.anthropic.com/careers" },
  { company: "OpenAI", role: "Solutions Architect", location: "Remote (US)", category: "Solutions", roleUrl: "https://openai.com/careers/search/?q=solutions+architect", careers: "https://openai.com/careers/search/" },
  { company: "OpenAI", role: "Forward Deployed Engineer", location: "Remote (US)", category: "Forward Deployed", roleUrl: "https://openai.com/careers/search/?q=forward+deployed", careers: "https://openai.com/careers/search/" },
  { company: "Lovable", role: "Forward Deployed Engineer", location: "Remote", category: "Forward Deployed", roleUrl: "https://lovable.dev/careers", careers: "https://lovable.dev/careers" },
  { company: "Lovable", role: "Customer Engineer", location: "Remote", category: "Customer Eng", roleUrl: "https://lovable.dev/careers", careers: "https://lovable.dev/careers" },
  { company: "Cursor", role: "Forward Deployed Engineer", location: "Remote (US)", category: "Forward Deployed", roleUrl: "https://cursor.com/careers", careers: "https://cursor.com/careers" },
  { company: "Perplexity", role: "Enterprise Solutions", location: "Remote (US)", category: "Solutions", roleUrl: "https://www.perplexity.ai/hub/careers", careers: "https://www.perplexity.ai/hub/careers" },
  { company: "Glean", role: "Customer Engineer", location: "Remote (US)", category: "Customer Eng", roleUrl: "https://www.glean.com/careers?department=Customer%20Engineering", careers: "https://www.glean.com/careers" },
  { company: "Writer", role: "AI Solutions Architect", location: "Remote (US)", category: "Solutions", roleUrl: "https://writer.com/careers/", careers: "https://writer.com/careers/" },
  { company: "Writer", role: "Deployment Manager", location: "Remote (US)", category: "Deployment", roleUrl: "https://writer.com/careers/", careers: "https://writer.com/careers/" },
  { company: "Decagon", role: "Implementation Manager", location: "Remote (US)", category: "Implementation", roleUrl: "https://decagon.ai/careers", careers: "https://decagon.ai/careers" },
  { company: "Databricks", role: "AI Solutions Architect", location: "Remote (US)", category: "Solutions", roleUrl: "https://www.databricks.com/company/careers/open-positions?search=AI%20solutions", careers: "https://www.databricks.com/company/careers" },
  { company: "Vercel", role: "Solutions Engineer, AI", location: "Remote (US)", category: "Solutions", roleUrl: "https://vercel.com/careers?department=Sales", careers: "https://vercel.com/careers" },
  { company: "Zapier", role: "AI Product Manager", location: "Remote (US)", category: "AI PM", roleUrl: "https://zapier.com/jobs#open-roles", careers: "https://zapier.com/jobs" },
  { company: "GitLab", role: "AI Solutions Architect", location: "Remote (US)", category: "Solutions", roleUrl: "https://about.gitlab.com/jobs/all-jobs/?search=AI", careers: "https://about.gitlab.com/jobs/" },
  { company: "Hugging Face", role: "Customer Success / Solutions", location: "Remote (US)", category: "Customer Eng", roleUrl: "https://apply.workable.com/huggingface/", careers: "https://huggingface.co/join" },
];

function MatchesPage() {
  return (
    <main
      className="min-h-screen bg-background px-6 py-12"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/apply" className="text-sm text-muted-foreground hover:text-foreground">
            ← Application kit
          </Link>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {MATCHES.length} live openings tracked
          </span>
        </div>

        <header className="mt-8 border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Job Matches
          </p>
          <h1
            className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Where to apply this week.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Curated openings at frontier AI companies for the role types you're
            targeting. Click a company to jump to their careers page, filter for the
            role, then click <em>Tailor</em> to generate a role-specific resume.
          </p>
        </header>

        <div className="mt-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-foreground">Company</th>
                <th className="px-4 py-3 font-semibold text-foreground">Role</th>
                <th className="px-4 py-3 font-semibold text-foreground hidden sm:table-cell">
                  Location
                </th>
                <th className="px-4 py-3 font-semibold text-foreground hidden md:table-cell">
                  Type
                </th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {MATCHES.map((m, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <a href={m.careers} target="_blank" rel="noreferrer" className="hover:underline">
                      {m.company}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-foreground">{m.role}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {m.location}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {m.category}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to="/apply/tailor"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Tailor →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Static list, refreshed manually. Phase 2 (queued): daily auto-scrape + AI
          match scoring per opening.
        </p>
      </div>
    </main>
  );
}
