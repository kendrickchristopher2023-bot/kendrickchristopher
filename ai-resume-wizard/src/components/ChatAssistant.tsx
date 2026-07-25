// Floating chat assistant widget. Renders on authenticated pages only.
// Posts to /api/chat with the current Supabase bearer token; the server
// route grounds responses in the user's own resume and exposes tools that
// call the same tailor / interview-prep / follow-up server functions used
// by the rest of the app.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string; tools?: { name: string; ok: boolean; summary: string }[] };

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Hi — I'm your job-search assistant. I can tailor your resume + cover letter to any job description, draft interview stories, write a referral DM, or a follow-up email. Paste a job description or ask a question. You can also attach a resume PDF/DOCX or a screenshot of a posting. I never submit applications for you.",
};

const GREETING_KEY = "chat-assistant-greeting-seen-v1";

const ACCEPT =
  ".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp";

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("Thinking…");
  const [err, setErr] = useState<string | null>(null);
  const [attached, setAttached] = useState<File | null>(null);
  const [greeting, setGreeting] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // One-time proactive greeting bubble anchored above the closed chat button.
  // Persisted in localStorage so it never re-pops on navigation or reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(GREETING_KEY)) return;
    } catch {
      return;
    }
    const showTimer = window.setTimeout(() => setGreeting(true), 2500);
    const hideTimer = window.setTimeout(() => {
      setGreeting(false);
      try { window.localStorage.setItem(GREETING_KEY, "1"); } catch { /* ignore */ }
    }, 2500 + 10_000);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const markGreetingSeen = () => {
    setGreeting(false);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(GREETING_KEY, "1");
    } catch { /* ignore */ }
  };

  const getToken = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    return token;
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !attached) || busy) return;
    setInput("");
    setErr(null);
    setBusy(true);

    try {
      const token = await getToken();
      let userContent = text;

      if (attached) {
        setBusyMsg(`Extracting ${attached.name}…`);
        const fd = new FormData();
        fd.append("file", attached);
        fd.append("mode", "text");
        const xres = await fetch("/api/extract", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const xdata = (await xres.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!xres.ok || !xdata.text) {
          throw new Error(xdata.error || `Couldn't read file (${xres.status})`);
        }
        const attachedBlock = `\n\n[Attached file: ${attached.name}]\n${xdata.text}`;
        userContent = text ? `${text}${attachedBlock}` : `I've attached a file:${attachedBlock}`;
      }

      const nextMessages: Msg[] = [
        ...messages,
        {
          role: "user",
          content: attached
            ? (text ? `${text}\n\n📎 ${attached.name}` : `📎 Attached ${attached.name}`)
            : text,
        },
      ];
      setMessages(nextMessages);
      setAttached(null);
      if (fileRef.current) fileRef.current.value = "";

      setBusyMsg("Thinking…");
      const payload = {
        // Send the extracted content to the model, not the emoji preview.
        messages: nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
          .concat([{ role: "user", content: userContent }]),
      };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Assistant unavailable (${res.status})`);
      const data = (await res.json()) as {
        text: string;
        tools?: { name: string; ok: boolean; summary: string }[];
      };
      setMessages((cur) => [
        ...cur,
        { role: "assistant", content: data.text || "(no response)", tools: data.tools },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
      setBusyMsg("Thinking…");
    }
  };

  const openChat = () => {
    setOpen(true);
    markGreetingSeen();
  };

  if (!open) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {greeting && (
          <div
            role="status"
            className="relative max-w-[260px] rounded-lg border border-border bg-card px-3 py-2 pr-7 text-xs text-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
          >
            <button
              type="button"
              onClick={markGreetingSeen}
              aria-label="Dismiss"
              className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
            <p>Hey — need a hand with a job? I'll be parked right here whenever you want me.</p>
            <span className="absolute -bottom-1 right-5 h-2 w-2 rotate-45 border-b border-r border-border bg-card" />
          </div>
        )}
        <button
          type="button"
          onClick={openChat}
          aria-label="Open assistant"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          <span className="text-xl">💬</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Assistant</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Grounded in your resume
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap " +
                (m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground")
              }
            >
              {m.content}
            </div>
            {m.tools && m.tools.length > 0 && (
              <div className="mt-1 space-y-1">
                {m.tools.map((t, j) => (
                  <p
                    key={j}
                    className={
                      "text-[10px] " +
                      (t.ok ? "text-muted-foreground" : "text-destructive")
                    }
                  >
                    ⚙ {t.name}: {t.summary}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <p className="text-xs italic text-muted-foreground">{busyMsg}</p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>

      <div className="border-t border-border p-3">
        {attached && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
            <span className="truncate">
              📎 {attached.name} · {(attached.size / 1024).toFixed(0)} KB
            </span>
            <button
              type="button"
              onClick={() => {
                setAttached(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="ml-2 text-muted-foreground hover:text-foreground"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={(e) => setAttached(e.target.files?.[0] ?? null)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Attach file"
            title="Attach a PDF, DOCX, or image (up to 10MB)"
            className="rounded-md border border-input px-2 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            📎
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask me anything, or paste a job description…"
            rows={2}
            disabled={busy}
            className="flex-1 resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={busy || (!input.trim() && !attached)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          I can't submit or fill external applications. Files stay in memory — only the
          extracted text is used.
        </p>
      </div>
    </div>
  );
}
