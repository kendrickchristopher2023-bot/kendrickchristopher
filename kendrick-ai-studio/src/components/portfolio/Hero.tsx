import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
        <div className="aurora absolute -right-24 top-24 size-[26rem] rounded-full bg-accent/20 blur-[110px] [animation-delay:-6s]" />
        <div className="aurora absolute -left-24 top-56 size-[24rem] rounded-full bg-primary-glow/15 blur-[110px] [animation-delay:-10s]" />
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-accent" />
          AI Builder, shipping in production
        </Reveal>

        <Reveal delay={80}>
          <p className="mt-8 text-sm font-medium tracking-[0.24em] text-muted-foreground uppercase">
            Christopher Kendrick
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl leading-[1.05] font-bold sm:text-6xl lg:text-7xl">
            I build AI products <span className="text-gradient">that ship.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Full stack AI builder shipping live products with Lovable, the Claude API, and Claude
            Code. From customer facing SaaS to internal automation that runs every day.
          </p>
        </Reveal>

        <Reveal delay={240} className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="hero" size="xl">
            <a href="#projects">
              See my work
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild variant="outlineGlow" size="xl">
            <a href="#contact">
              <Mail className="size-4" />
              Get in touch
            </a>
          </Button>
        </Reveal>

        <Reveal delay={320} className="mt-16 grid grid-cols-2 gap-4 sm:max-w-2xl sm:grid-cols-4">
          {[
            { value: "3", label: "Live products" },
            { value: "18+", label: "Projects automated" },
            { value: "Daily", label: "Agents in production" },
            { value: "Hours", label: "Manual work replaced" },
          ].map((stat) => (
            <div key={stat.label} className="surface-card rounded-xl px-4 py-4">
              <div className="font-display text-2xl font-bold text-gradient">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}