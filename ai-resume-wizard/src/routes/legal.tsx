import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Terms & Privacy — Application Kit" },
      {
        name: "description",
        content:
          "Plain-language terms of service and privacy policy for this invite-only job application toolkit.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-10">
        <header>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Terms of Service &amp; Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>

          <div
            role="note"
            className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100"
          >
            <strong>Plain-language draft.</strong> This document has not been
            reviewed by a lawyer. It's meant to honestly describe what this app
            does today. Before opening this tool to a wider audience it should
            get real legal review.
          </div>
        </header>

        <Section title="What this tool is">
          <p>
            This is a personal, <strong>invite-only</strong> job-application
            toolkit. It helps you prepare application materials — tailored
            resumes, cover letters, interview prep, referral messages, and
            similar drafts — using an AI model provider accessed through the
            app's AI gateway.
          </p>
          <p>
            The tool <strong>prepares</strong> materials. It never submits
            applications, messages, or forms to any third-party site on your
            behalf.
          </p>
        </Section>

        <Section title="Data we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>Your account email address.</li>
            <li>
              Resume and profile content you paste in, upload, or type.
            </li>
            <li>
              Application-tracking entries you log (companies, roles, statuses,
              notes, etc.).
            </li>
            <li>
              Per-feature daily usage counts (how many times you used each
              feature that day), used to enforce plan limits.
            </li>
            <li>
              A personal browser-extension access token —{" "}
              <em>only if you create one</em>.
            </li>
          </ul>
          <p>
            If you upload a file (PDF, DOCX, image), it is processed to extract
            the text and is <strong>not stored as a raw file</strong>{" "}
            afterward. Only the extracted text is kept, tied to your account.
          </p>
        </Section>

        <Section title="How your data is used">
          <p>
            Your data is used solely to power the tool's own features for you:
            resume tailoring, cover letter generation, interview prep, LinkedIn
            optimization, referral drafts, chat assistance, and application
            tracking. Content is sent to an AI model provider through the app's
            AI gateway for those specific operations.
          </p>
          <p>
            <strong>We do not sell your data.</strong> We do not use it for
            advertising. We do not share it with third parties beyond the AI
            gateway calls required to power the feature you're using.
          </p>
        </Section>

        <Section title="Who can see your data">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>You.</strong> Only your own signed-in account can view
              your resume content, tailored output, cover letters, and
              application entries. This is enforced by row-level access control
              in the database.
            </li>
            <li>
              <strong>The admin (site owner).</strong> Can see operational
              metadata about accounts: email, plan tier, signup date, and daily
              usage counts. The admin <strong>cannot</strong> see your resume
              content, tailored resumes, cover letters, interview-prep output,
              or any other generated content.
            </li>
          </ul>
        </Section>

        <Section title="Access, plans, and limits">
          <p>
            Access is currently invite-only. The admin can approve, deny, or
            revoke access at their discretion. Per-feature usage limits apply
            based on your plan tier. Revoking access disables sign-in; your
            stored data is preserved unless you request deletion.
          </p>
        </Section>

        <Section title="Deleting your data">
          <p>
            You can request that your account and stored data be deleted by
            contacting the site owner. Include the email address on your
            account so the request can be verified.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Content is stored in a managed database with row-level access
            control so that only your account can read your rows. Authentication
            uses magic-link sign-in. No system is perfectly secure; you use this
            tool at your own risk under the plain-language terms above.
          </p>
        </Section>

        <Section title="Changes to this document">
          <p>
            This page may be updated as the tool evolves. Meaningful changes
            will be reflected in the "Last updated" date at the top.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, deletion requests, or concerns: contact the site owner
            through the email address associated with your invite.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}
