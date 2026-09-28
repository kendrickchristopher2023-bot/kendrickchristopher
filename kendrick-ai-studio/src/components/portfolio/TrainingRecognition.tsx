import { AbbrText } from "./AbbrText";
import { Reveal } from "./Reveal";

const TILES = [
  { value: "Top 3%", label: "Ranked 7th of 270 in the internal CXD AI Training Club" },
  { value: "8/8", label: "Training stations completed, plus the Boss Drill and Boss Level challenges" },
  { value: "L4", label: "AI Fluency, self-assessed on Delegation and Description" },
];

export function TrainingRecognition() {
  return (
    <section id="training-recognition" className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Training & Recognition<span className="text-gradient">.</span>
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((tile, index) => (
            <Reveal key={tile.label} delay={index * 80}>
              <div className="surface-card h-full rounded-xl px-4 py-5">
                <div className="font-display text-3xl font-bold text-gradient sm:text-4xl">
                  {tile.value}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  <AbbrText text={tile.label} />
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={240}>
          <p className="mt-8 max-w-4xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            <AbbrText text="I completed the program's Boss Level by running a full QA pass on one of my own shipped tools, testing navigation, forms, and mobile layout with Claude and filing a structured bug report. That test-and-verify discipline, plus a provisional Often Exceed Expectations performance rating, is what I bring to product, implementation, and quality work." />
          </p>
        </Reveal>
      </div>
    </section>
  );
}
