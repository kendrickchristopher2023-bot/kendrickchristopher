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
    "Hi — I'm your job-search assistant. Paste a job description and I'll tailor your resume, draft a cover letter, or prep interview stories. I can't submit any applications for you.",
};

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setErr(null);
    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const payload = {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
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
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <span className="text-xl">💬</span>
      </button>
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
          <p className="text-xs italic text-muted-foreground">Thinking…</p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
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
            disabled={busy || !input.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          I can't submit or fill external applications. Answers use your saved resume.
        </p>
      </div>
    </div>
  );
}
