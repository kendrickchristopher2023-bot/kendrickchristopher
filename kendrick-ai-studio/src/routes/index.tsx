import { createFileRoute } from "@tanstack/react-router";
import { About } from "@/components/portfolio/About";
import { Impact } from "@/components/portfolio/Impact";
import { TrainingRecognition } from "@/components/portfolio/TrainingRecognition";
import { Contact } from "@/components/portfolio/Contact";
import { CoverLetter } from "@/components/portfolio/CoverLetter";
import { Footer } from "@/components/portfolio/Footer";
import { Hero } from "@/components/portfolio/Hero";
import { Nav } from "@/components/portfolio/Nav";
import { Projects } from "@/components/portfolio/Projects";
import { Resume } from "@/components/portfolio/Resume";
import { ScrollToTop } from "@/components/portfolio/ScrollToTop";
import { Skills } from "@/components/portfolio/Skills";


const TITLE = "Christopher Kendrick | AI Builder";
const DESCRIPTION =
  "Christopher Kendrick builds and ships AI powered products end to end, from customer facing SaaS to scheduled AI agents that run every day.";
const SOCIAL_DESCRIPTION =
  "Full stack AI builder shipping live products with Lovable, the Claude API, and Claude Code.";
const SITE_URL = "https://christopherbkendrick.app";
const OG_IMAGE = "https://christopherbkendrick.app/og-image.jpg";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: SOCIAL_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Christopher Kendrick, AI Builder" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: "Full stack AI builder shipping live AI powered products and automations." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Christopher Kendrick",
          jobTitle: "AI Builder",
          description: DESCRIPTION,
          email: "mailto:kendrickchristopher@hotmail.com",
        }),
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <About />
        <Impact />
        <TrainingRecognition />
        <Projects />
        <Skills />

        <Resume />
        <CoverLetter />
        <Contact />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
