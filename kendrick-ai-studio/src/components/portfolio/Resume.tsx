import { DownloadButtons } from "./DownloadButtons";
import { downloadResumeDocx, downloadResumePdf } from "./documents";
import { Reveal } from "./Reveal";
import {
  RESUME_ADDITIONAL,
  RESUME_CERTIFICATIONS,
  RESUME_CONTACT,
  RESUME_EDUCATION,
  RESUME_EXPERIENCE,
  RESUME_SKILLS,
  RESUME_SUMMARY,
  RESUME_TECH,
} from "./resume-data";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function Resume() {
  return (
    <section id="resume" className="scroll-mt-24 border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Resume<span className="text-gradient">.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            A decade of technical onboarding and training leadership, now paired with hands on AI
            engineering.
          </p>
          <div className="mt-7">
            <DownloadButtons
              label="resume"
              onPdf={downloadResumePdf}
              onDocx={downloadResumeDocx}
            />
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <article className="surface-card rounded-3xl p-6 sm:p-10">
            <header className="border-b border-border pb-6">
              <h3 className="font-display text-2xl font-bold sm:text-3xl">
                {RESUME_CONTACT.name}
              </h3>
              <p className="text-gradient mt-1 font-semibold">{RESUME_CONTACT.title}</p>
              <p className="mt-3 text-sm break-words text-muted-foreground">
                {RESUME_CONTACT.email} <span className="text-border">|</span>{" "}
                {RESUME_CONTACT.phone} <span className="text-border">|</span>{" "}
                {RESUME_CONTACT.linkedin} <span className="text-border">|</span>{" "}
                <a
                  href="https://christopherbkendrick.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gradient font-medium hover:opacity-80"
                >
                  {RESUME_CONTACT.website}
                </a>{" "}
                <span className="text-border">|</span>{" "}
                {RESUME_CONTACT.location}
              </p>
            </header>

            <div className="mt-8 space-y-10">
              <Block title="Summary">
                <p className="text-sm leading-relaxed text-muted-foreground">{RESUME_SUMMARY}</p>
              </Block>

              <Block title="Skills">
                <ul className="flex flex-wrap gap-2">
                  {RESUME_SKILLS.map((skill) => (
                    <li
                      key={skill}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Experience">
                <ol className="space-y-8">
                  {RESUME_EXPERIENCE.map((job) => (
                    <li key={job.role} className="border-l border-border pl-5">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <h4 className="font-semibold">{job.role}</h4>
                        <span className="text-xs text-muted-foreground">{job.dates}</span>
                      </div>
                      <p className="text-sm text-primary/90">{job.company}</p>
                      <ul className="mt-3 space-y-2">
                        {job.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gradient-brand" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </Block>

              <Block title="Additional Experience">
                <ul className="space-y-2">
                  {RESUME_ADDITIONAL.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gradient-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Block>

              <Block title="Technical Proficiencies">
                <dl className="grid gap-4 sm:grid-cols-2">
                  {RESUME_TECH.map((group) => (
                    <div key={group.label} className="rounded-2xl border border-border p-4">
                      <dt className="text-sm font-semibold">{group.label}</dt>
                      <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {group.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Block>

              <div className="grid gap-10 sm:grid-cols-2">
                <Block title="Education">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {RESUME_EDUCATION}
                  </p>
                </Block>
                <Block title="Certifications">
                  <ul className="space-y-2">
                    {RESUME_CERTIFICATIONS.map((cert) => (
                      <li key={cert} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gradient-brand" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}