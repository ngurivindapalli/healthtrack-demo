"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Eyebrow } from "@/components/ui";

type Assessment = {
  status: "scored" | "insufficient";
  displayScore: number | null;
  message: string;
  detail: string;
  disclaimer: string;
  calculatedAt?: string;
  provenance?: { calculatedAt: string };
  pillars: Array<{ id: string; score: number | null; eligible: boolean; weight: number; records: number; explanation: string }>;
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

export function WellnessPanel() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/v1/me/wellness")
      .then(async (response) => {
        if (!response.ok) {
          setError("Wellness status could not be loaded.");
          return;
        }
        setAssessment((await response.json()) as Assessment);
      })
      .catch(() => setError("Wellness status could not be loaded."));
  }, []);

  const calculatedAt = assessment?.provenance?.calculatedAt ?? assessment?.calculatedAt;
  const scored = assessment?.displayScore != null;

  return (
    <Card>
      <Eyebrow>Wellness Tracker</Eyebrow>
      <h2 className="mt-2 text-lg font-semibold">
        {scored ? assessment?.displayScore : assessment?.message ?? (error || "Loading the scoring status…")}
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{assessment?.detail ?? "Nutrition, sleep, activity, and recovery are the only contributors."}</p>
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
        {(assessment?.pillars ?? [
          { id: "nutrition", weight: 25, records: 0, explanation: "No nutrition records yet.", score: null, eligible: false },
          { id: "sleep", weight: 30, records: 0, explanation: "No sleep records yet.", score: null, eligible: false },
          { id: "activity", weight: 25, records: 0, explanation: "No activity records yet.", score: null, eligible: false },
          { id: "recovery", weight: 20, records: 0, explanation: "No recovery records yet.", score: null, eligible: false },
        ]).map((pillar) => (
          <li key={pillar.id}>
            <Link href={LINKS[pillar.id] ?? "/today"} className="block rounded-xl bg-paper px-3 py-3 text-sm hover:bg-paper-2">
              <span className="flex items-center justify-between gap-2 font-medium">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: COLORS[pillar.id] }} aria-hidden />
                  {`${pillar.id.charAt(0).toUpperCase()}${pillar.id.slice(1)} · ${pillar.weight}%`}
                </span>
                <span className="text-muted">{pillar.eligible ? pillar.score : "Missing"}</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">{pillar.explanation}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/today/track/hydration" className="block rounded-xl bg-paper px-3 py-3 text-sm hover:bg-paper-2">
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--info)" }} aria-hidden />
              Hydration
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">Tracked with nutrition. It is not a fifth Wellness Score pillar.</span>
          </Link>
        </li>
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted">
        {assessment?.disclaimer ?? "This is a nonclinical wellness indicator of progress toward your saved goals, not a diagnosis or proof of nutritional health."}{" "}
        Meal logging measures whether meals were recorded. Matching a calorie target is not proof of nutritional health.{" "}
        {calculatedAt ? `Checked ${new Date(calculatedAt).toLocaleString()}.` : ""} Companion freshness is shown below. Labs and cycle context cannot change this score.
      </p>
    </Card>
  );
}
