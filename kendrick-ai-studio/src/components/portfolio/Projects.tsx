import { cn } from "@/lib/utils";
import { AI_AT_WORK, AI_PRODUCTS, type Project } from "./data";
import { Reveal } from "./Reveal";

function ProjectCard({ project, delay }: { project: Project; delay: number }) {
  return (
    <Reveal as="li" delay={delay} className="h-full">
      <div
        className={cn(
          "group surface-card flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50",
          project.flagship && "ring-1 ring-primary/40",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-lg font-semibold transition-colors group-hover:text-gradient">
            {project.title}
          </h4>
          <div className="flex shrink-0 items-center gap-2">
            {project.live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                <span className="size-1.5 rounded-full bg-accent" />
                Live
              </span>
            ) : null}
          </div>
        </div>

        {project.flagship ? (
          <span className="mt-3 w-fit rounded-full bg-gradient-brand px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            Flagship
          </span>
        ) : null}

        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

export function Projects() {
  return (
    <section id="projects" className="scroll-mt-24 border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Featured projects<span className="text-gradient">.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Products people pay for, and AI systems that run every day inside a real business.
          </p>
        </Reveal>

        <div className="mt-14">
          <Reveal className="flex items-center gap-3">
            <h3 className="font-display text-xl font-semibold">AI Products</h3>
            <span className="h-px flex-1 bg-border" />
          </Reveal>
          <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {AI_PRODUCTS.map((project, i) => (
              <ProjectCard key={project.title} project={project} delay={i * 80} />
            ))}
          </ul>
        </div>

        <div className="mt-16">
          <Reveal className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-xl font-semibold">AI at Work</h3>
            <span className="text-sm text-muted-foreground">
              AI engineering at Mews, a hospitality technology company
            </span>
            <span className="hidden h-px flex-1 bg-border sm:block" />
          </Reveal>
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {AI_AT_WORK.map((project, i) => (
              <ProjectCard key={project.title} project={project} delay={i * 80} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}