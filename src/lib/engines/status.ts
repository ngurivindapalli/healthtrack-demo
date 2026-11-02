import { clamp, tanh } from "@/lib/math";
import { CLINICAL_DISCLAIMER, ENGINE_VERSION, METRICS } from "@/lib/metrics";
import {
  baselineConfidence,
  direction7d,
  snapshotMetric,
} from "@/lib/engines/baseline";
import { evaluateSafety } from "@/lib/engines/safety";
import { formatHours, formatSignedPct } from "@/lib/format";
import type {
  ContextFlags,
  DailyObservation,
  DomainScore,
  LabReport,
  MetricId,
  PillarId,
  StatusDriver,
  WellnessState,
  WellnessStatusResult,
} from "@/lib/types";

const DOMAIN_METRICS: Record<Exclude<PillarId, "labs">, MetricId[]> = {
  sleep: ["sleepHours", "sleepEfficiency", "bedtimeMinutes"],
  recovery: ["hrv", "rhr", "energy", "stress"],
  nutrition: ["lastMealHour"],
  activity: ["steps", "activeMinutes"],
};

function wellnessDeviation(z: number, better: "higher" | "lower"): number {
  const signed = better === "higher" ? -z : z;
  return tanh(Math.max(0, signed));
}

function domainScore(
  observations: DailyObservation[],
  pillar: Exclude<PillarId, "labs">,
  asOf: string,
  sex: string,
): DomainScore {
  const snapshots = DOMAIN_METRICS[pillar].map((id) =>
    snapshotMetric(observations, id, asOf, sex),
  );
  let num = 0;
  let den = 0;
  let persistence = 0;
  let reliability = 0;
  for (const snap of snapshots) {
    const def = METRICS[snap.metricId];
    if (snap.robustZ == null || !snap.baseline) continue;
    const f = wellnessDeviation(snap.robustZ, def.better);
    const p = clamp(snap.persistenceDays / 4, 0, 1.4);
    num += def.domainWeight * snap.reliability * p * f;
    den += def.domainWeight * snap.reliability;
    persistence = Math.max(persistence, snap.persistenceDays);
    reliability = Math.max(reliability, snap.reliability);
  }
  return {
    pillar,
    deviation: den === 0 ? 0 : num / den,
    persistence,
    reliability,
    drivers: snapshots,
  };
}

function mapState(
  composite: number,
  persistence: number,
  agreeing: number,
  safety: WellnessStatusResult["safety"],
): WellnessState {
  if (safety.severity === "urgent") return "needs_attention";
  if (composite >= 0.72 && (persistence >= 3 || agreeing >= 2)) {
    return composite >= 1.05 ? "needs_attention" : "shifting";
  }
  if (composite >= 0.45) return "stable";
  if (composite <= 0.22 && persistence <= 1) return "thriving";
  return "stable";
}

function stateSummary(
  state: WellnessState,
  drivers: StatusDriver[],
  persistence: number,
): string {
  const top = drivers[0];
  if (state === "shifting") {
    return `Your wellness pattern has shifted over the last ${Math.max(persistence, 4)} days. ${
      top ? `${top.label} and recovery have both moved away from your typical range.` : ""
    } Nothing here necessarily indicates a medical problem. Recent patterns suggest that prioritizing recovery may be useful.`;
  }
  if (state === "needs_attention") {
    return "Several personal signals are further from your baseline than usual, or a safety rule is active. This is still a wellness interpretation, not a diagnosis.";
  }
  if (state === "thriving") {
    return "Most of your signals are at or better than your personal baseline. Keep the behaviors that already appear to work for you.";
  }
  return "Most signals remain near what is normal for you. Small day-to-day movement is expected.";
}

export function computeWellnessStatus(input: {
  observations: DailyObservation[];
  asOf: string;
  sex: string;
  labs: LabReport[];
  context: ContextFlags;
  sourcesConnected: number;
  recencyHours: number | null;
}): WellnessStatusResult {
  const domains = (
    ["sleep", "recovery", "nutrition", "activity"] as const
  ).map((pillar) =>
    domainScore(input.observations, pillar, input.asOf, input.sex),
  );

  const weights: Record<string, number> = {
    sleep: 1.1,
    recovery: 1.2,
    nutrition: 0.55,
    activity: 0.7,
  };
  let num = 0;
  let den = 0;
  for (const domain of domains) {
    const w = weights[domain.pillar] ?? 1;
    num += w * domain.reliability * domain.deviation;
    den += w * domain.reliability;
  }
  const composite = den === 0 ? 0 : num / den;
  const persistence = Math.max(...domains.map((d) => d.persistence), 0);
  const agreeing = domains.filter((d) => d.deviation >= 0.35).length;
  const safety = evaluateSafety(input.observations, input.labs, input.context);

  const driverSnaps = domains
    .flatMap((d) => d.drivers)
    .filter((snap) => snap.worseForWellness && snap.percentVsBaseline != null)
    .sort(
      (a, b) =>
        Math.abs(b.percentVsBaseline ?? 0) - Math.abs(a.percentVsBaseline ?? 0),
    );

  const drivers: StatusDriver[] = driverSnaps.slice(0, 4).map((snap) => {
    const def = METRICS[snap.metricId];
    const pct = snap.percentVsBaseline ?? 0;
    const latest = snap.recentMean;
    const extra =
      snap.metricId === "sleepHours" && latest != null
        ? ` Recent stretch: ${formatHours(latest)} vs ${formatHours(snap.baseline?.median ?? 0)} typical.`
        : "";
    return {
      metricId: snap.metricId,
      label: def.label,
      summary: `${def.label} is ${formatSignedPct(pct)} versus your baseline.${extra}`,
      percentVsBaseline: pct,
      persistenceDays: snap.persistenceDays,
    };
  });

  const insufficient = den === 0;
  const state = insufficient ? "stable" : mapState(composite, persistence, agreeing, safety);
  const validDays = input.observations.filter((row) => row.sleepHours != null).length;
  const missingLast7 = input.observations.slice(-7).filter((row) => row.sleepHours == null).length;
  const sources = Array.from(
    new Set(input.observations.flatMap((row) => row.sources)),
  );

  return {
    engineVersion: ENGINE_VERSION,
    state,
    direction7d: direction7d(input.observations, input.asOf),
    confidence: baselineConfidence(input.observations, input.sourcesConnected),
    composite,
    persistenceDays: persistence,
    agreeingDomains: agreeing,
    summary: insufficient
      ? "There are not enough stored measurements to compare with your baseline. Missing values stay blank."
      : stateSummary(state, drivers, persistence),
    clinicalDisclaimer: CLINICAL_DISCLAIMER,
    drivers,
    domains,
    dataQuality: {
      coverageDays: validDays,
      missingLast7,
      sources,
      recencyHours: input.recencyHours,
    },
    safety,
  };
}
