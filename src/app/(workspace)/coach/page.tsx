"use client";

import { useState } from "react";
import { Button, Card, Eyebrow, TextArea } from "@/components/ui";
import { coachSuggestions } from "@/lib/services/coach";
import { useDemo, welcomeIfEmpty } from "@/lib/store";

export default function CoachPage() {
  const { state, model, askCoach, rateCoach } = useDemo();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const messages = welcomeIfEmpty(state.coachMessages, model);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setBusy(true);
    setDraft("");
    try {
      await askCoach(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>AI Health Coach</Eyebrow>
        <h1 className="display mt-1 text-3xl">Why, and what next?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Context-aware, priority-preserving, non-diagnostic. Default answers come from the same status and ranking engines as Today. An optional live model can rewrite wording if an API key is configured — it is not required.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {coachSuggestions().map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full bg-surface px-3 py-1.5 text-left text-sm hairline hover:bg-paper-2"
            onClick={() => send(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <Card
            key={message.id}
            className={message.role === "user" ? "ml-8 bg-paper" : "mr-8"}
          >
            <p className="text-[11px] uppercase tracking-wide text-muted">
              {message.role === "user" ? "You" : "Coach"}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
            {message.sources?.length ? (
              <p className="mt-2 text-[11px] text-muted">Sources: {message.sources.join(" · ")}</p>
            ) : null}
            {message.safetyFlag ? (
              <p className="mt-2 text-xs text-attention">Safety-aware reply</p>
            ) : null}
            {message.role === "coach" && state.coachMessages.some((item) => item.id === message.id) ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Was this useful?</span>
                <button
                  type="button"
                  className={`rounded-full px-2 py-1 ${message.feedback === "useful" ? "bg-pine text-surface" : "bg-paper-2"}`}
                  onClick={() => rateCoach(message.id, "useful")}
                >
                  Useful
                </button>
                <button
                  type="button"
                  className={`rounded-full px-2 py-1 ${message.feedback === "not_useful" ? "bg-ink text-surface" : "bg-paper-2"}`}
                  onClick={() => rateCoach(message.id, "not_useful")}
                >
                  Not useful
                </button>
              </div>
            ) : null}
          </Card>
        ))}
        {busy ? (
          <Card>
            <p className="text-sm text-muted">Looking at the current status engine…</p>
          </Card>
        ) : null}
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <TextArea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about status, Today's ONE, recovery, or labs"
        />
        <Button type="submit" disabled={busy || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
