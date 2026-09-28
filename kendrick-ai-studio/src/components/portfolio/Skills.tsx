"use client";

import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SKILL_GROUPS, SKILL_INFO } from "./data";
import { Reveal } from "./Reveal";

function SkillInfo({ term }: { term: string }) {
  const definition = SKILL_INFO[term];
  if (!definition) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is ${term}?`}
          className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Info className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className="text-sm font-semibold">{term}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{definition}</p>
      </PopoverContent>
    </Popover>
  );
}

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
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  {group.title}
                  {group.title === "AI & LLM" && <SkillInfo term="LLM" />}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      {item}
                      {item === "RAG" && <SkillInfo term="RAG" />}
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