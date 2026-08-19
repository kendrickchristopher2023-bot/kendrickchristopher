import { createFileRoute } from "@tanstack/react-router";
import { About } from "@/components/portfolio/About";
import { Contact } from "@/components/portfolio/Contact";
import { Footer } from "@/components/portfolio/Footer";
import { Hero } from "@/components/portfolio/Hero";
import { Nav } from "@/components/portfolio/Nav";
import { Projects } from "@/components/portfolio/Projects";
import { ScrollToTop } from "@/components/portfolio/ScrollToTop";
import { Skills } from "@/components/portfolio/Skills";

const TITLE = "Christopher Kendrick | AI Builder";
const DESCRIPTION =
  "Christopher Kendrick builds and ships AI powered products end to end, from customer facing SaaS to scheduled AI agents that run every day.";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
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
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
