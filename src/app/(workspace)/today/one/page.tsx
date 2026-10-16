"use client";

import Link from "next/link";
import { DeclinePrompt } from "@/components/decline-prompt";
import { Button, Card, Eyebrow } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function TodayOnePage() {
  const { model, setCommitment, state } = useDemo();
  const one = model.todayOne;

  if (!one) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/today" className="text-sm text-pine hover:underline">
          ← Today
        </Link>
        <Card>
          <p className="text-sm">No Today’s ONE is currently eligible.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/today" className="text-sm text-pine hover:underline">
        ← Today
      </Link>
      <header>
        <Eyebrow>Today’s ONE</Eyebrow>
        <h1 className="display mt-2 text-3xl">{one.candidate.title}</h1>
        <p className="mt-2 text-base text-ink-soft">{one.candidate.instruction}</p>
      </header>

      <Card>
        <h2 className="text-base font-semibold">Why this?</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{one.why}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Relevance</dt>
            <dd>{Math.round(one.relevance * 100)}</dd>
          </div>
          <div>
            <dt className="text-muted">Evidence</dt>
            <dd>{Math.round(one.evidence * 100)}</dd>
          </div>
          <div>
            <dt className="text-muted">Benefit</dt>
            <dd>{Math.round(one.expectedBenefit * 100)}</dd>
          </div>
          <div>
            <dt className="text-muted">Feasibility</dt>
            <dd>{Math.round(one.feasibility * 100)}</dd>
          </div>
          <div>
            <dt className="text-muted">Confidence</dt>
            <dd>{Math.round(one.confidence * 100)}</dd>
          </div>
          <div>
            <dt className="text-muted">Burden penalty</dt>
            <dd>{one.penalty.toFixed(2)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          Ranked as relevance × evidence × expected personal benefit × feasibility × confidence × preference, penalized for burden, risk and uncertainty. From a curated low-risk library — the coach cannot invent an unsafe intervention.
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Replace with something more feasible</h2>
        <ul className="mt-3 space-y-3">
          {model.replacements.map((item) => (
            <li key={item.candidate.id} className="flex items-start justify-between gap-3 border-b border-line pb-3 last:border-0">
              <div>
                <p className="font-medium">{item.candidate.title}</p>
                <p className="text-sm text-ink-soft">{item.candidate.instruction}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  setCommitment("replaced", { replacedWithId: item.candidate.id, reason: "User replacement" })
                }
              >
                Use this
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="one" onClick={() => setCommitment("accepted")}>
          Accept
        </Button>
        <Button onClick={() => setCommitment("completed")}>Mark done</Button>
        <Button variant="secondary" onClick={() => setCommitment("snoozed", { reason: "Snoozed from detail" })}>
          Snooze
        </Button>
        <DeclinePrompt
          key={one.candidate.id}
          onDecline={(reason) => setCommitment("declined", { reason })}
        />
      </div>
      <p className="text-xs text-muted">
        Current decision: {state.todayCommitment?.decision ?? "pending"}. Feedback updates this demo’s personalization.
      </p>
    </div>
  );
}
