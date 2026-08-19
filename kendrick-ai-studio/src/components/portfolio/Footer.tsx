import { Github, Linkedin } from "lucide-react";
import { SOCIAL_LINKS } from "./data";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
        <div>
          <p className="font-display font-semibold">Christopher Kendrick</p>
          <p className="mt-1 text-sm text-muted-foreground">AI builder shipping real products.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={SOCIAL_LINKS.linkedin}
            aria-label="LinkedIn profile"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Linkedin className="size-4" />
          </a>
          <a
            href={SOCIAL_LINKS.github}
            aria-label="GitHub profile"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Github className="size-4" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground">© {year} Christopher Kendrick</p>
      </div>
    </footer>
  );
}