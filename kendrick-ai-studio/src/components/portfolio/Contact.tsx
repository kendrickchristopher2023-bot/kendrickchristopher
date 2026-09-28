import { useState } from "react";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { submitContact } from "@/lib/contact.functions";
import { EMAIL } from "./data";
import { Reveal } from "./Reveal";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "Name is too long."),
  email: z.string().trim().email("Please enter a valid email address.").max(200),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters.")
    .max(5000, "Message is too long."),
});

type Errors = Partial<Record<"name" | "email" | "message" | "form", string>>;

export function Contact() {
  const [values, setValues] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const send = useServerFn(submitContact);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof Errors;
        if (!next[key]) next[key] = issue.message;
      });
      setErrors(next);
      return;
    }

    setStatus("sending");
    try {
      const result = await send({ data: { ...parsed.data, website: honeypot } });
      if (!result.ok) {
        setStatus("idle");
        setErrors({
          form:
            result.reason === "rate_limited"
              ? "Too many messages sent just now. Please wait a minute and try again."
              : "Something went wrong sending your message. Please try again.",
        });
        return;
      }
    } catch {
      setStatus("idle");
      setErrors({ form: "Something went wrong sending your message. Please try again." });
      return;
    }

    setStatus("sent");
    setValues({ name: "", email: "", message: "" });
  }

  return (
    <section id="contact" className="scroll-mt-24 border-t border-border py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <h2 className="text-3xl font-bold sm:text-4xl">
              Get in touch<span className="text-gradient">.</span>
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Hiring, collaborating, or curious about shipping AI into production. Send a note and
              I will get back to you.
            </p>
            <a
              href={`mailto:${EMAIL}`}
              className="surface-card mt-8 inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors hover:border-primary/50"
            >
              <Mail className="size-4 text-accent" />
              {EMAIL}
            </a>
          </Reveal>

          <Reveal delay={120}>
            <div className="surface-card rounded-2xl p-6 sm:p-8">
              {status === "sent" ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CheckCircle2 className="size-10 text-accent" />
                  <h3 className="mt-4 text-xl font-semibold">Message received</h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Thanks for reaching out. Your message has been saved and I will reply as soon
                    as I can.
                  </p>
                  <Button
                    variant="outlineGlow"
                    size="lg"
                    className="mt-6"
                    onClick={() => setStatus("idle")}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate className="space-y-5">
                  <div className="sr-only" aria-hidden="true">
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={values.name}
                      onChange={(e) => set("name")(e.target.value)}
                      placeholder="Your name"
                      aria-invalid={Boolean(errors.name)}
                    />
                    {errors.name ? (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={values.email}
                      onChange={(e) => set("email")(e.target.value)}
                      placeholder="you@company.com"
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={values.message}
                      onChange={(e) => set("message")(e.target.value)}
                      placeholder="What would you like to build or talk about?"
                      aria-invalid={Boolean(errors.message)}
                    />
                    {errors.message ? (
                      <p className="text-xs text-destructive">{errors.message}</p>
                    ) : null}
                  </div>

                  {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}

                  <Button
                    type="submit"
                    variant="hero"
                    size="xl"
                    className="w-full"
                    disabled={status === "sending"}
                  >
                    {status === "sending" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {status === "sending" ? "Sending" : "Send message"}
                  </Button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}