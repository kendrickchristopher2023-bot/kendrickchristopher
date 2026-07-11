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
  category: "Deployment" | "Forward Deployed" | "Solutions" | "Customer Eng" | "Implementation";
  careers: string;
};

// Curated list — updated 2026-07. Links point to each company's careers page
// (not a specific req ID) so they stay live longer. Filter for the categories
// on arrival.
const MATCHES: Match[] = [
  { company: "OpenAI", role: "Deployment Strategist / Manager", location: "NYC / SF", category: "Deployment", careers: "https://openai.com/careers/search/" },
  { company: "OpenAI", role: "Forward Deployed Engineer", location: "NYC / SF", category: "Forward Deployed", careers: "https://openai.com/careers/search/" },
  { company: "OpenAI", role: "Solutions Architect", location: "NYC / SF / Remote", category: "Solutions", careers: "https://openai.com/careers/search/" },
  { company: "Anthropic", role: "Applied AI, Enterprise", location: "NYC / SF", category: "Solutions", careers: "https://www.anthropic.com/careers" },
  { company: "Anthropic", role: "Customer Engineer", location: "NYC / SF / Remote", category: "Customer Eng", careers: "https://www.anthropic.com/careers" },
  { company: "Anthropic", role: "Deployment Strategist", location: "NYC / SF", category: "Deployment", careers: "https://www.anthropic.com/careers" },
  { company: "Lovable", role: "Forward Deployed Engineer", location: "Stockholm / Remote", category: "Forward Deployed", careers: "https://lovable.dev/careers" },
  { company: "Lovable", role: "Customer Engineer", location: "Remote", category: "Customer Eng", careers: "https://lovable.dev/careers" },
  { company: "Cursor", role: "Forward Deployed Engineer", location: "SF", category: "Forward Deployed", careers: "https://cursor.com/careers" },
  { company: "Cursor", role: "Solutions Engineer", location: "SF", category: "Solutions", careers: "https://cursor.com/careers" },
  { company: "Perplexity", role: "Enterprise Solutions", location: "SF / NYC", category: "Solutions", careers: "https://www.perplexity.ai/hub/careers" },
  { company: "Sierra", role: "Agent Engineer / Forward Deployed", location: "SF", category: "Forward Deployed", careers: "https://sierra.ai/careers" },
  { company: "Decagon", role: "Forward Deployed Engineer", location: "SF / NYC", category: "Forward Deployed", careers: "https://decagon.ai/careers" },
  { company: "Decagon", role: "Implementation Manager", location: "SF / NYC / Remote", category: "Implementation", careers: "https://decagon.ai/careers" },
  { company: "Glean", role: "Solutions Engineer", location: "NYC / Remote", category: "Solutions", careers: "https://www.glean.com/careers" },
  { company: "Glean", role: "Customer Engineer", location: "NYC / Remote", category: "Customer Eng", careers: "https://www.glean.com/careers" },
  { company: "Writer", role: "AI Solutions Architect", location: "NYC / SF / Remote", category: "Solutions", careers: "https://writer.com/careers/" },
  { company: "Writer", role: "Deployment Manager", location: "Remote", category: "Deployment", careers: "https://writer.com/careers/" },
  { company: "Hebbia", role: "Forward Deployed Engineer", location: "NYC", category: "Forward Deployed", careers: "https://www.hebbia.com/careers" },
  { company: "Hebbia", role: "Solutions Engineer", location: "NYC", category: "Solutions", careers: "https://www.hebbia.com/careers" },
  { company: "Harvey", role: "Forward Deployed Engineer", location: "NYC / SF", category: "Forward Deployed", careers: "https://www.harvey.ai/careers" },
  { company: "Sana", role: "Solutions Engineer", location: "NYC / Stockholm", category: "Solutions", careers: "https://sanalabs.com/careers" },
  { company: "Adept / Amazon AGI", role: "Applied Deployment", location: "SF / Seattle", category: "Deployment", careers: "https://www.amazon.jobs/en/teams/agi" },
  { company: "Runway", role: "Customer Solutions", location: "NYC", category: "Customer Eng", careers: "https://runwayml.com/careers/" },
  { company: "Scale AI", role: "Forward Deployed / Enterprise", location: "NYC / SF", category: "Forward Deployed", careers: "https://scale.com/careers" },
  { company: "Databricks", role: "AI Solutions Architect", location: "NYC / Remote", category: "Solutions", careers: "https://www.databricks.com/company/careers" },
  { company: "Vercel", role: "Solutions Engineer, AI", location: "NYC / Remote", category: "Solutions", careers: "https://vercel.com/careers" },
  { company: "Notion", role: "AI Deployment Specialist", location: "NYC / SF", category: "Deployment", careers: "https://www.notion.so/careers" },
  { company: "Retool", role: "Forward Deployed Engineer", location: "NYC / SF", category: "Forward Deployed", careers: "https://retool.com/careers" },
  { company: "Ramp", role: "AI Solutions", location: "NYC", category: "Solutions", careers: "https://ramp.com/careers" },
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
