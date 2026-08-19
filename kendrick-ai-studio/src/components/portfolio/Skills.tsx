import { SKILL_GROUPS } from "./data";
import { Reveal } from "./Reveal";

export function Skills() {
  return (
    <section id="skills" className="scroll-mt-24 border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Skills and tools<span className="text-gradient">.</span>
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2">
          {SKILL_GROUPS.map((group, i) => (
            <Reveal as="li" key={group.title} delay={i * 80}>
              <div className="surface-card h-full rounded-2xl p-6">
                <h3 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {group.title}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}