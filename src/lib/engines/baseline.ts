import { mad, median } from "@/lib/math";
import {
  BASELINE_WINDOW_DAYS,
  METRICS,
  RECENT_WINDOW_DAYS,
} from "@/lib/metrics";
import type {
  BaselineConfidence,
  BaselineStat,
  DailyObservation,
  Direction,
  MetricId,
  MetricSnapshot,
} from "@/lib/types";

const PEER_SLEEP: Record<string, number> = {
  male: 7.1,
  female: 7.3,
  other: 7.2,
  prefer_not_to_say: 7.2,
};

function values(
  observations: DailyObservation[],
  metricId: MetricId,
): { date: string; value: number }[] {
  return observations
    .map((row) => {
      const value = row[metricId];
      return typeof value === "number" ? { date: row.date, value } : null;
    })
    .filter((item): item is { date: string; value: number } => item !== null);
}

export function sliceWindow(
  observations: DailyObservation[],
  endDate: string,
  days: number,
  offsetFromEnd = 0,
): DailyObservation[] {
  const endIndex = observations.findIndex((row) => row.date === endDate);
  const last = endIndex === -1 ? observations.length - 1 : endIndex;
  const hi = last - offsetFromEnd;
  const lo = Math.max(0, hi - days + 1);
  return observations.slice(lo, hi + 1);
}

export function computeBaseline(
  observations: DailyObservation[],
  metricId: MetricId,
  asOf: string,
): BaselineStat | null {
  const window = sliceWindow(
    observations,
    asOf,
    BASELINE_WINDOW_DAYS,
    RECENT_WINDOW_DAYS,
  );
  const series = values(window, metricId).map((item) => item.value);
  const med = median(series);
  if (med == null) return null;
  return {
    metricId,
    median: med,
    mad: mad(series, med),
    sampleDays: series.length,
    validRatio: window.length === 0 ? 0 : series.length / window.length,
  };
}

export function persistenceDays(
  observations: DailyObservation[],
  metricId: MetricId,
  asOf: string,
  worse: (value: number, baseline: number) => boolean,
  baseline: number,
): number {
  const endIndex = observations.findIndex((row) => row.date === asOf);
  const last = endIndex === -1 ? observations.length - 1 : endIndex;
  let count = 0;
  for (let i = last; i >= 0; i -= 1) {
    const value = observations[i]?.[metricId];
    if (typeof value !== "number") break;
    if (!worse(value, baseline)) break;
    count += 1;
  }
  return count;
}

function directionFromPct(pct: number, better: "higher" | "lower"): Direction {
  if (Math.abs(pct) < 0.03) return "flat";
  const up = pct > 0;
  if (better === "higher") return up ? "up" : "down";
  return up ? "up" : "down";
}

export function snapshotMetric(
  observations: DailyObservation[],
  metricId: MetricId,
  asOf: string,
  sex: string,
): MetricSnapshot {
  const def = METRICS[metricId];
  const baseline = computeBaseline(observations, metricId, asOf);
  const recent = values(sliceWindow(observations, asOf, RECENT_WINDOW_DAYS), metricId);
  const latestRow = observations.find((row) => row.date === asOf) ?? observations.at(-1);
  const latest = typeof latestRow?.[metricId] === "number" ? latestRow[metricId] : null;
  const recentMean =
    recent.length === 0
      ? null
      : recent.reduce((sum, item) => sum + item.value, 0) / recent.length;

  let percentVsBaseline: number | null = null;
  let z: number | null = null;
  if (baseline && recentMean != null) {
    percentVsBaseline = (recentMean - baseline.median) / baseline.median;
    const scale = 1.4826 * Math.max(baseline.mad, def.unit === "hours" ? 0.08 : 0.4);
    z = (recentMean - baseline.median) / scale;
  }

  const worseForWellness =
    z != null &&
    (def.better === "higher" ? z < -0.35 : z > 0.35);

  const reliability = baseline
    ? Math.min(1, baseline.validRatio * (baseline.sampleDays / 18))
    : 0;

  const persist = baseline
    ? persistenceDays(
        observations,
        metricId,
        asOf,
        (value, med) =>
          def.better === "higher" ? value < med * 0.97 : value > med * 1.03,
        baseline.median,
      )
    : 0;

  const peer =
    metricId === "sleepHours"
      ? (PEER_SLEEP[sex] ?? 7.2)
      : metricId === "steps"
        ? 7500
        : metricId === "rhr"
          ? sex === "female"
            ? 64
            : 61
          : metricId === "hrv"
            ? sex === "female"
              ? 42
              : 45
            : null;

  const general =
    metricId === "rhr"
      ? "Adult resting HR is often cited around 60–80 bpm; your baseline matters more."
      : metricId === "sleepHours"
        ? "Many adults are advised to get 7 or more hours; your own distribution is the primary comparison."
        : metricId === "hrv"
          ? "HRV ranges vary widely by device and person. Population bands are a weak comparison."
          : null;

  return {
    metricId,
    latest,
    recentMean,
    baseline,
    percentVsBaseline,
    robustZ: z,
    direction:
      percentVsBaseline == null
        ? "flat"
        : directionFromPct(percentVsBaseline, def.better),
    worseForWellness,
    reliability,
    persistenceDays: persist,
    peerReference: peer,
    generalReference: general,
  };
}

export function baselineConfidence(
  observations: DailyObservation[],
  sourcesConnected: number,
): BaselineConfidence {
  const validDays = observations.filter((row) => row.sleepHours != null).length;
  if (validDays >= 21 && sourcesConnected >= 1) return "established";
  if (validDays >= 10) return "moderate";
  return "building";
}

export function direction7d(
  observations: DailyObservation[],
  asOf: string,
): Direction {
  const recent = sliceWindow(observations, asOf, 7);
  const prior = sliceWindow(observations, asOf, 7, 7);
  const recSleep = values(recent, "hrv").map((item) => item.value);
  const priorSleep = values(prior, "hrv").map((item) => item.value);
  const recMed = median(recSleep);
  const priorMed = median(priorSleep);
  if (recMed == null || priorMed == null) return "flat";
  const pct = (recMed - priorMed) / priorMed;
  if (pct > 0.04) return "up";
  if (pct < -0.04) return "down";
  return "flat";
}
