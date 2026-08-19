import { Reveal } from "./Reveal";

const METRICS = [
  { value: "20%", label: "Faster onboarding at Mews through a structured delivery framework" },
  { value: "60%", label: "Go-live rate in under 30 days across the active portfolio" },
  { value: "60%", label: "Less training time, from 5 days to 2, at PurpleCloud Technologies" },
  { value: "50%", label: "Faster implementation cycles through process re-engineering" },
];

export function Impact() {
  return (
    <section id="impact" className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Impact<span className="text-gradient">.</span>
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((metric, index) => (
            <Reveal key={metric.label} delay={index * 80}>
              <div className="surface-card h-full rounded-xl px-4 py-5">
                <div className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                  {metric.value}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {metric.label}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
