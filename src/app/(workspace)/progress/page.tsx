"use client";

import Link from "next/link";
import { useState } from "react";
import { BEHAVIOR_LIBRARY } from "@/lib/behaviors";
import { Button, Card, Eyebrow, TextArea } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function ProgressPage() {
  const { state, model, saveReflection } = useDemo();
  const [note, setNote] = useState(state.reflection?.note ?? "");
  const [energy, setEnergy] = useState(state.reflection?.energy ?? 6);
  const [stress, setStress] = useState(state.reflection?.stress ?? 5);
  const [saved, setSaved] = useState(false);

  const completed = state.adherence.filter((item) => item.kind === "completed");
  const byBehavior = BEHAVIOR_LIBRARY.map((behavior) => {
    const events = state.adherence.filter((item) => item.behaviorId === behavior.id);
    const assoc = model.associations.find((item) => item.behaviorId === behavior.id);
    return { behavior, events, assoc };
  }).filter((row) => row.events.length > 0 || row.assoc);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>Progress</Eyebrow>
        <h1 className="display mt-1 text-3xl">What appears to work for you</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Not “you logged more data.” The point is whether a behavior is repeatedly seen alongside better signals.
        </p>
      </header>

      <Card>
        <p className="text-sm">
          {completed.length} completed attempts in this demo workspace · Repeat ONE{" "}
          {model.repeatOne ? `is “${model.repeatOne.candidate.title}”` : "has not unlocked yet"}.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Personal Behavior Library</h2>
        <ul className="mt-4 space-y-3">
          {byBehavior.map(({ behavior, events, assoc }) => {
            const done = events.filter((item) => item.kind === "completed").length;
            const missed = events.filter((item) => item.kind === "missed" || item.kind === "declined").length;
            return (
              <li key={behavior.id} className="border-b border-line pb-3 last:border-0">
                <Link href={`/progress/${behavior.id}`} className="block hover:text-pine">
                  <p className="font-medium">{behavior.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {done} completed · {missed} missed/declined
                    {assoc ? ` · association ${assoc.direction} (${Math.round(assoc.confidence * 100)}%)` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Observed associations</h2>
        <ul className="mt-3 space-y-3 text-sm text-ink-soft">
          {model.associations.map((item) => (
            <li key={item.behaviorId}>{item.summary}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Labeled association, not causation.</p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Weekly reflection</h2>
        <p className="mt-1 text-xs text-muted">Week of Oct 12, 2026</p>
        <p className="mt-2 text-sm text-ink-soft">
          October so far:{" "}
          {state.adherence.filter((item) => item.date.startsWith("2026-10") && item.kind === "completed").length}{" "}
          completed attempts in this sample history.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Energy {energy}/10
            <input
              type="range"
              min={1}
              max={10}
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
          <label className="text-sm">
            Stress {stress}/10
            <input
              type="range"
              min={1}
              max={10}
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </div>
        <TextArea className="mt-3" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button
          className="mt-3"
          onClick={() => {
            saveReflection(note, energy, stress);
            setSaved(true);
          }}
        >
          Save reflection
        </Button>
        {saved ? <p className="mt-2 text-sm text-pine">Saved in this browser.</p> : null}
      </Card>
    </div>
  );
}
