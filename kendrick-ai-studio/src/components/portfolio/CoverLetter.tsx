import { DownloadButtons } from "./DownloadButtons";
import { downloadCoverLetterDocx, downloadCoverLetterPdf } from "./documents";
import { Reveal } from "./Reveal";
import { COVER_LETTER_PARAGRAPHS, RESUME_CONTACT } from "./resume-data";

export function CoverLetter() {
  return (
    <section id="cover-letter" className="scroll-mt-24 border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Reveal>
          <h2 className="text-3xl font-bold sm:text-4xl">
            Cover letter<span className="text-gradient">.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Why I build, and what I would bring to your team.
          </p>
          <div className="mt-7">
            <DownloadButtons
              label="cover letter"
              onPdf={downloadCoverLetterPdf}
              onDocx={downloadCoverLetterDocx}
            />
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-12">
          <article className="surface-card rounded-3xl p-6 sm:p-10">
            <header className="border-b border-border pb-6">
              <h3 className="font-display text-2xl font-bold">{RESUME_CONTACT.name}</h3>
              <p className="mt-2 text-sm break-words text-muted-foreground">
                {RESUME_CONTACT.location} <span className="text-border">|</span>{" "}
                {RESUME_CONTACT.email} <span className="text-border">|</span>{" "}
                {RESUME_CONTACT.phone} <span className="text-border">|</span>{" "}
                {RESUME_CONTACT.linkedin}
              </p>
            </header>

            <p className="mt-8 font-semibold">Dear Hiring Manager,</p>
            <div className="mt-5 space-y-5">
              {COVER_LETTER_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="mt-8 text-muted-foreground">Sincerely,</p>
            <p className="text-gradient mt-1 font-display text-lg font-semibold">
              {RESUME_CONTACT.name}
            </p>
          </article>
        </Reveal>
      </div>
    </section>
  );
}