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
              I am a Customer Onboarding Manager at Mews and an AI builder. For more than a decade I
              have led technical onboarding, training, and software implementation across the
              hospitality technology space, helping teams adopt complex Property Management Systems
              and turning messy, manual workflows into processes people can actually follow.
            </p>
            <p>
              Over the past year I have put that same focus into building. I design and ship AI
              powered applications and automations end to end, from a Claude powered tool that
              drafts client follow up emails to scheduled agents that pull live data from Salesforce
              and Databricks and deliver risk digests and dashboards to leadership every morning.
              Outside of work I ship customer facing products too, including live platforms with
              authentication, databases, and payments.
            </p>
            <p>
              I move quickly with modern AI tooling like Claude Code, the Claude API, and Lovable, I
              document what I build so others can use it, and I measure success by real outcomes:
              faster onboarding, cleaner data, and hours of manual work removed.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}