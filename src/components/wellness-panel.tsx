"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Eyebrow } from "@/components/ui";
import { formatDisplayedScore } from "@/lib/format";

export type WellnessScoreView = {
  status: "scored" | "insufficient";
  displayScore: number | null;
  message: string;
  detail: string;
  pillars: Array<{ id: string; score: number | null; eligible: boolean; weight: number }>;
  personalComparison: { message: string };
  populationComparison: { message: string };
};

const LINKS: Record<string, string> = {
  nutrition: "/today/track/meal",
  sleep: "/today/track/sleep",
  activity: "/today/track/workout",
  recovery: "/today/track/recovery",
};

const COLORS: Record<string, string> = {
  nutrition: "var(--exercise)",
  sleep: "var(--sleep)",
  activity: "var(--move)",
  recovery: "var(--heart)",
};

const LABELS: Record<string, string> = {
  nutrition: "Nutrition",
  sleep: "Sleep",
  activity: "Activity",
  recovery: "Recovery",
};

const EMPTY_PILLARS: WellnessScoreView["pillars"] = [
  { id: "nutrition", weight: 25, score: null, eligible: false },
  { id: "sleep", weight: 30, score: null, eligible: false },
  { id: "activity", weight: 25, score: null, eligible: false },
  { id: "recovery", weight: 20, score: null, eligible: false },
];

export const SCORE_NOT_A_DIAGNOSIS = "This number is not a diagnosis.";

export function WellnessScoreCard({
  assessment,
  error = "",
}: {
  assessment: WellnessScoreView | null;
  error?: string;
}) {
  const displayedScore = formatDisplayedScore(assessment?.displayScore);
  const scored = displayedScore != null;

  return (
    <Card>
      <Eyebrow>Wellness Tracker</Eyebrow>
      <h2 className="mt-2 text-lg font-semibold">
        {scored ? displayedScore : assessment?.message ?? (error || "Loading the scoring status…")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        {scored ? SCORE_NOT_A_DIAGNOSIS : assessment?.detail ?? "Nutrition, sleep, activity, and recovery are the only contributors."}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-paper px-4 py-3">
          <p className="text-xs font-medium text-muted">Personal comparison</p>
          <p className="mt-1 text-sm">{assessment?.personalComparison.message ?? "Your personal baseline is still building."}</p>
        </div>
        <div className="rounded-2xl bg-paper px-4 py-3">
          <p className="text-xs font-medium text-muted">Population comparison</p>
          <p className="mt-1 text-sm">{assessment?.populationComparison.message ?? "Population comparison unavailable."}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {(assessment?.pillars ?? EMPTY_PILLARS).filter((pillar) => pillar.id in LABELS).map((pillar) => {
          const shown = pillar.eligible ? formatDisplayedScore(pillar.score) : null;
          return (
            <li key={pillar.id}>
              <Link href={LINKS[pillar.id] ?? "/today"} className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-3 text-sm hover:bg-paper-2">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[pillar.id] }} aria-hidden />
                  {`${LABELS[pillar.id]} · ${pillar.weight}%`}
                </span>
                <span className="font-medium tabular-nums text-ink">{shown ?? "Missing"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function WellnessPanel() {
  const [assessment, setAssessment] = useState<WellnessScoreView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/v1/me/wellness")
      .then(async (response) => {
        if (!response.ok) {
          setError("Wellness status could not be loaded.");
          return;
        }
        setAssessment((await response.json()) as WellnessScoreView);
      })
      .catch(() => setError("Wellness status could not be loaded."));
  }, []);

  return <WellnessScoreCard assessment={assessment} error={error} />;
}
