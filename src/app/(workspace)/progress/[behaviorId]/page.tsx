"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getBehavior } from "@/lib/behaviors";
import { Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function BehaviorDetailPage() {
  const params = useParams<{ behaviorId: string }>();
  const { state, model } = useDemo();
  const behavior = getBehavior(params.behaviorId);
  const events = state.adherence.filter((item) => item.behaviorId === params.behaviorId);
  const assoc = model.associations.find((item) => item.behaviorId === params.behaviorId);

  if (!behavior) {
    return (
      <div className="mx-auto max-w-3xl">
        <p>Unknown behavior.</p>
        <Link href="/progress" className="text-sm text-pine">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/progress" className="text-sm text-pine hover:underline">
        ← Progress
      </Link>
      <header>
        <Eyebrow>Behavior</Eyebrow>
        <h1 className="display mt-1 text-3xl">{behavior.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{behavior.instruction}</p>
      </header>
      <Card>
        <h2 className="text-base font-semibold">Did it appear to work?</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          {assoc ? assoc.summary : "No association computed yet for this behavior."}
        </p>
        <p className="mt-3 text-sm">
          Outcome label:{" "}
          <strong>
            {assoc?.direction === "positive"
              ? "Yes (association)"
              : assoc?.direction === "negative"
                ? "No (association)"
                : "Uncertain"}
          </strong>
        </p>
      </Card>
      <Card>
        <h2 className="text-base font-semibold">Attempt history</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No attempts stored yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {events
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((event) => (
                <li key={event.id} className="flex justify-between gap-3 py-2">
                  <span>{event.date}</span>
                  <span className="capitalize text-ink-soft">
                    {event.kind}
                    {event.reason ? ` · ${event.reason}` : ""}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
