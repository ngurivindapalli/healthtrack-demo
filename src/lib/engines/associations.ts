import { mean } from "@/lib/math";
import { METRICS } from "@/lib/metrics";
import type {
  AssociationResult,
  DailyObservation,
} from "@/lib/types";

function nextDayMetric(
  observations: DailyObservation[],
  index: number,
  metric: "hrv" | "sleepHours" | "rhr",
): number | null {
  const next = observations[index + 1];
  const value = next?.[metric];
  return typeof value === "number" ? value : null;
}

export function walkingRecoveryAssociation(
  observations: DailyObservation[],
): AssociationResult {
  const withWalk: number[] = [];
  const without: number[] = [];
  observations.forEach((row, index) => {
    const outcome = nextDayMetric(observations, index, "hrv");
    if (outcome == null) return;
    if ((row.eveningWalkMinutes ?? 0) >= 15) withWalk.push(outcome);
    else if (!row.travel) without.push(outcome);
  });
  const a = mean(withWalk) ?? 0;
  const b = mean(without) ?? 0;
  const delta = a - b;
  const sampleSize = withWalk.length;
  let direction: AssociationResult["direction"] = "none";
  let confidence = 0;
  if (sampleSize >= 6 && without.length >= 6) {
    if (delta >= 3) {
      direction = "positive";
      confidence = Math.min(0.82, 0.45 + sampleSize * 0.02);
    } else if (delta <= -3) {
      direction = "negative";
      confidence = 0.4;
    } else {
      direction = "uncertain";
      confidence = 0.28;
    }
  } else if (sampleSize > 0) {
    direction = "uncertain";
    confidence = 0.2;
  }
  return {
    behaviorId: "evening-walk",
    direction,
    confidence,
    sampleSize,
    metric: "hrv",
    withBehavior: a,
    withoutBehavior: b,
    summary:
      direction === "positive"
        ? `On ${sampleSize} evenings with a 15–25 minute post-dinner walk, next-morning HRV averaged ${a.toFixed(0)} ms versus ${b.toFixed(0)} ms on other days. This is an association, not proof that walking caused the difference.`
        : "Not enough repeated personal observations yet to describe a stable association.",
  };
}

export function lateMealAssociation(
  observations: DailyObservation[],
): AssociationResult {
  const late: number[] = [];
  const earlier: number[] = [];
  observations.forEach((row, index) => {
    const outcome = nextDayMetric(observations, index, "hrv");
    if (outcome == null || row.lastMealHour == null) return;
    if (row.lastMealHour >= 20.8) late.push(outcome);
    else earlier.push(outcome);
  });
  const a = mean(late) ?? 0;
  const b = mean(earlier) ?? 0;
  const delta = a - b;
  const direction: AssociationResult["direction"] =
    late.length >= 5 && delta <= -3 ? "negative" : late.length >= 3 ? "uncertain" : "none";
  return {
    behaviorId: "earlier-dinner",
    direction,
    confidence: direction === "negative" ? 0.58 : 0.22,
    sampleSize: late.length,
    metric: "hrv",
    withBehavior: a,
    withoutBehavior: b,
    summary:
      direction === "negative"
        ? `Evenings when the last meal was after about 8:45 pm were followed by lower HRV (${a.toFixed(0)} vs ${b.toFixed(0)} ms). Association only.`
        : "Meal-timing association is still forming.",
  };
}

export function sleepThresholdAssociation(
  observations: DailyObservation[],
): AssociationResult {
  const enough: number[] = [];
  const short: number[] = [];
  observations.forEach((row, index) => {
    const outcome = nextDayMetric(observations, index, "hrv");
    if (outcome == null || row.sleepHours == null) return;
    if (row.sleepHours >= 7.25) enough.push(outcome);
    else short.push(outcome);
  });
  const a = mean(enough) ?? 0;
  const b = mean(short) ?? 0;
  return {
    behaviorId: "normal-bedtime",
    direction: a - b >= 3 ? "positive" : "uncertain",
    confidence: enough.length >= 8 ? 0.64 : 0.3,
    sampleSize: enough.length,
    metric: "hrv",
    withBehavior: a,
    withoutBehavior: b,
    summary: `Nights at or above 7h 15m of sleep were followed by higher HRV (${METRICS.hrv.format(a)} vs ${METRICS.hrv.format(b)}). Association only — not a clinical sleep prescription.`,
  };
}

export function allAssociations(
  observations: DailyObservation[],
): AssociationResult[] {
  return [
    walkingRecoveryAssociation(observations),
    lateMealAssociation(observations),
    sleepThresholdAssociation(observations),
  ];
}
