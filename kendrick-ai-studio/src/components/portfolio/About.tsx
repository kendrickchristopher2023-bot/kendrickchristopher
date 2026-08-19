import { Reveal } from "./Reveal";

export function About() {
  return (
    <section id="about" className="scroll-mt-24 border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <h2 className="text-3xl font-bold sm:text-4xl">
              About<span className="text-gradient">.</span>
            </h2>
          </Reveal>
          <Reveal delay={100} className="space-y-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Christopher designs and ships AI powered applications and automations end to end. He
              works across the full stack, from customer facing products with authentication,
              databases, and payments, to scheduled AI agents that pull from Salesforce,
              Databricks, and Slack to replace hours of manual work.
            </p>
            <p>
              He builds fast with modern AI tooling and cares about real, measurable impact.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}