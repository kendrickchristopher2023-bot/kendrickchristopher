import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AbbrText } from "./AbbrText";
import { AI_AT_WORK_GROUPS, AI_PRODUCTS, type Project, type ProjectStatus } from "./data";
import { Reveal } from "./Reveal";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Live: "border-status-live/40 bg-status-live/10 text-status-live",
  "In progress": "border-status-progress/40 bg-status-progress/10 text-status-progress",
  Delivered: "border-status-delivered/40 bg-status-delivered/10 text-status-delivered",
  "Early access": "border-status-progress/40 bg-status-progress/10 text-status-progress",
};

const STATUS_DOTS: Record<ProjectStatus, string> = {
  Live: "bg-status-live",
  "In progress": "bg-status-progress",
  Delivered: "bg-status-delivered",
  "Early access": "bg-status-progress",
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        STATUS_STYLES[status],
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOTS[status])} />
      {status}
    </span>
  );
}

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
            <AbbrText text={project.title} />
          </h4>
          <div className="flex shrink-0 items-center gap-2">
            {project.status ? <StatusBadge status={project.status} /> : null}
            {!project.status && project.live ? (
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
          <AbbrText text={project.description} />
        </p>

        {project.flow ? (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              How it works
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {project.flow.map((step, index) => (
                <span key={step} className="flex items-center gap-1.5">
                  <span className="rounded-md border border-border/80 bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground">
                    {step}
                  </span>
                  {index < project.flow!.length - 1 ? (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ) : null}

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
          <Reveal>
            <div className="flex items-center gap-3">
              <h3 className="font-display text-xl font-semibold">The Kenroe Collective</h3>
              <span className="h-px flex-1 bg-border" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              A suite of products I design, build, and ship end to end.
            </p>
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
          {AI_AT_WORK_GROUPS.map((group) => (
            <div key={group.title} className="mt-8">
              <Reveal>
                <h4 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {group.title}
                </h4>
              </Reveal>
              <ul className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {group.projects.map((project, i) => (
                  <ProjectCard key={project.title} project={project} delay={i * 60} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}