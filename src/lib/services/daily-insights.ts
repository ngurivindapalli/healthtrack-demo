import { formatHours, minutesToClock } from "@/lib/format";
import { STATE_COPY } from "@/lib/metrics";
import { presentCoachReply } from "@/lib/services/coach-chat";
import type { DailyObservation, SafetyDecision, WellnessState, BaselineConfidence, Direction } from "@/lib/types";

export type DailyInsight = {
  overall: string;
  goingWell: string;
  attention: string;
  tryToday: string;
};

export type InsightCache = {
  fingerprint: string;
  date: string;
  insight: DailyInsight;
  at: number;
};

export const INSIGHT_COOLDOWN_MS = 45_000;

const inflight = new Map<string, Promise<DailyInsight | null>>();

export function hasInsightMeasurements(observations: DailyObservation[]): boolean {
  return observations.some((row) => row.sleepHours != null || row.steps != null || row.rhr != null || row.hrv != null);
}

export function insightFingerprint(observations: DailyObservation[]): string {
  return observations
    .map((row) =>
      [
        row.date,
        row.sleepHours ?? "",
        row.rhr ?? "",
        row.hrv ?? "",
        row.steps ?? "",
        row.energy ?? "",
        row.stress ?? "",
        row.eveningWalkMinutes ?? "",
        row.activeMinutes ?? "",
        row.lastMealHour ?? "",
      ].join(":"),
    )
    .join("|");
}

export function insightsPaused(safety: SafetyDecision): boolean {
  return safety.redirectToCare || safety.severity === "urgent";
}

function metric(value: number | null | undefined, render: (value: number) => string): string {
  return value == null || !Number.isFinite(value) ? "not recorded" : render(value);
}

export function buildInsightBrief(
  observations: DailyObservation[],
  status: { state: WellnessState; confidence: BaselineConfidence; direction7d: Direction; safety: SafetyDecision },
  asOf: string,
): string {
  const rows = observations.filter((row) => row.date);
  if (!hasInsightMeasurements(rows)) {
    return "No sleep, steps, or heart-rate measurements are stored. Do not invent any.";
  }
  const lines = [
    "Dates are UTC days. Use only the numbers below.",
    `Application status label: ${STATE_COPY[status.state].label}. Confidence: ${status.confidence}. Seven-day direction: ${status.direction7d}. This label is not a medical assessment.`,
  ];
  const latest = rows[rows.length - 1];
  if (latest?.date === asOf) {
    lines.push(
      `The UTC day ${asOf} is still open. Sleep and resting heart rate recorded for that morning can be discussed. Steps and evening activity on ${asOf} are not final.`,
    );
  }
  for (const row of rows) {
    const open = row.date === asOf ? " (current day, activity may still change)" : " (completed day)";
    lines.push(
      [
        `${row.date}${open}:`,
        `sleep ${metric(row.sleepHours, formatHours)}`,
        `bedtime ${metric(row.bedtimeMinutes, minutesToClock)}`,
        `resting heart rate ${metric(row.rhr, (value) => `${Math.round(value)} bpm`)}`,
        `HRV ${metric(row.hrv, (value) => `${Math.round(value)} ms`)}`,
        `steps ${metric(row.steps, (value) => String(Math.round(value)))}`,
        `active minutes ${metric(row.activeMinutes, (value) => String(Math.round(value)))}`,
        `evening walk ${metric(row.eveningWalkMinutes, (value) => `${Math.round(value)} min`)}`,
        `energy ${metric(row.energy, (value) => `${value}/10`)}`,
        `stress ${metric(row.stress, (value) => `${value}/10`)}`,
        `last meal ${metric(row.lastMealHour, (value) => minutesToClock(value * 60))}`,
      ].join(" "),
    );
  }
  if (status.safety.reason) {
    lines.push(`Safety note already shown to the user: ${status.safety.reason} Do not recommend strenuous exercise or dismiss this note.`);
  }
  return lines.join("\n");
}

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?/g) ?? [];
}

export function parseDailyInsight(raw: string, brief: string): DailyInsight | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const fields = ["overall", "goingWell", "attention", "tryToday"] as const;
  const insight = {} as DailyInsight;
  for (const field of fields) {
    const value = record[field];
    if (typeof value !== "string") return null;
    const prose = presentCoachReply(value, "daily insight").replace(/\*\*/g, "").trim();
    if (prose.length < 12 || prose.length > 420) return null;
    if (prose.includes("**")) return null;
    insight[field] = prose;
  }
  const allowed = new Set(numbersIn(brief));
  const used = numbersIn(Object.values(insight).join(" "));
  if (used.some((number) => !allowed.has(number))) return null;
  return insight;
}

export function matchInsightCache(cache: InsightCache | null, fingerprint: string, date: string): DailyInsight | null {
  if (!cache || cache.fingerprint !== fingerprint || cache.date !== date) return null;
  return cache.insight;
}

export function refreshCoolingDown(generatedAt: number, now: number): boolean {
  return now - generatedAt < INSIGHT_COOLDOWN_MS;
}

export function shareInsightRequest(key: string, run: () => Promise<DailyInsight | null>): Promise<DailyInsight | null> {
  const existing = inflight.get(key);
  if (existing) return existing;
  const pending = run().finally(() => {
    if (inflight.get(key) === pending) inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}
