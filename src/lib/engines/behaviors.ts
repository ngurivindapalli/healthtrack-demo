import { BEHAVIOR_LIBRARY } from "@/lib/behaviors";
import { clamp } from "@/lib/math";
import type {
  AssociationResult,
  BehaviorCandidate,
  ContextFlags,
  LabReport,
  RankedBehavior,
  SafetyDecision,
  WellnessStatusResult,
} from "@/lib/types";

export interface RankContext {
  status: WellnessStatusResult;
  associations: AssociationResult[];
  labs: LabReport[];
  context: ContextFlags;
  safety: SafetyDecision;
  snoozedIds: string[];
  declinedIds: string[];
  preferenceIds: string[];
  excludeIds?: string[];
}

function hba1cTrend(labs: LabReport[]): "up" | "flat" | "unknown" {
  const latest = labs
    .slice()
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
  const a1c = latest?.results.find((item) => item.analyte === "HbA1c");
  if (!a1c || a1c.priorValue == null) return "unknown";
  if (a1c.value - a1c.priorValue >= 0.2) return "up";
  return "flat";
}

function scoreCandidate(
  candidate: BehaviorCandidate,
  ctx: RankContext,
): RankedBehavior {
  const sleepDev =
    ctx.status.domains.find((d) => d.pillar === "sleep")?.deviation ?? 0;
  const recoveryDev =
    ctx.status.domains.find((d) => d.pillar === "recovery")?.deviation ?? 0;
  const activityDev =
    ctx.status.domains.find((d) => d.pillar === "activity")?.deviation ?? 0;
  const assoc = ctx.associations.find((a) => a.behaviorId === candidate.id);
  const a1c = hba1cTrend(ctx.labs);

  let relevance = 0.25;
  if (candidate.id === "normal-bedtime") {
    relevance = clamp(0.35 + sleepDev * 0.7 + recoveryDev * 0.45, 0, 1);
  } else if (candidate.id === "evening-walk") {
    relevance = clamp(
      0.3 + activityDev * 0.35 + (a1c === "up" ? 0.25 : 0) + recoveryDev * 0.15,
      0,
      1,
    );
  } else if (candidate.id === "earlier-dinner") {
    relevance = clamp(0.2 + (assoc?.direction === "negative" ? 0.35 : 0.1), 0, 1);
  } else if (candidate.id === "box-breathing") {
    relevance = clamp(0.15 + (ctx.status.drivers.some((d) => d.metricId === "stress") ? 0.4 : 0), 0, 1);
  } else if (candidate.id === "screens-off") {
    relevance = clamp(0.2 + sleepDev * 0.4, 0, 1);
  } else if (candidate.pillar === "activity") {
    relevance = clamp(0.2 + activityDev * 0.4, 0, 1);
  }

  const evidence = assoc
    ? clamp(
        (assoc.direction === "positive" || assoc.direction === "negative"
          ? 0.55
          : 0.25) + assoc.confidence * 0.4,
        0,
        1,
      )
    : 0.28;
  const expectedBenefit = clamp(
    relevance * 0.6 + evidence * 0.4 + (candidate.id === "normal-bedtime" ? 0.12 : 0),
    0,
    1,
  );
  const feasibility = ctx.context.travel
    ? clamp(1 - candidate.burden - 0.25, 0.15, 1)
    : clamp(1 - candidate.burden, 0.2, 1);
  const confidenceBoost =
    ctx.status.confidence === "established"
      ? 0.35
      : ctx.status.confidence === "moderate"
        ? 0.2
        : 0.05;
  const confidence = clamp(0.35 + confidenceBoost, 0, 1);
  const preference = ctx.preferenceIds.includes(candidate.id) ? 0.9 : 0.7;
  const uncertainty = 1 - evidence;
  const penalty =
    candidate.burden * 0.4 + uncertainty * 0.35 + (ctx.safety.severity !== "none" ? 0.4 : 0);

  const score =
    (relevance * evidence * expectedBenefit * feasibility * Math.max(confidence, 0.3) * preference) /
    (1 + penalty);

  const why = whyFor(candidate, ctx, assoc, a1c);
  return {
    candidate,
    score,
    relevance,
    evidence,
    expectedBenefit,
    feasibility,
    confidence,
    preference,
    penalty,
    why,
    evidenceNote: assoc?.summary ?? "Supported by general wellness practice, not yet a personal association.",
  };
}

function whyFor(
  candidate: BehaviorCandidate,
  ctx: RankContext,
  assoc: AssociationResult | undefined,
  a1c: "up" | "flat" | "unknown",
): string {
  if (candidate.id === "normal-bedtime") {
    return "Sleep duration and overnight recovery have both moved away from your baseline for several days. Aiming for your usual 10:30 pm bedtime is the lowest-risk way to give recovery a chance to return toward normal. This is a wellness suggestion, not a sleep-medicine prescription.";
  }
  if (candidate.id === "evening-walk") {
    const labBit =
      a1c === "up"
        ? " Your recent HbA1c also moved upward versus April — a laboratory interval change to review with a clinician, and a reason this behavior is relevant as a general wellness focus."
        : "";
    return `${assoc?.summary ?? "Evening walking is a low-risk activity."}${labBit}`;
  }
  if (candidate.id === "earlier-dinner") {
    return assoc?.summary ?? candidate.whyShort;
  }
  return candidate.whyShort;
}

export function rankTodayOne(ctx: RankContext): RankedBehavior[] {
  if (ctx.safety.suppressRecommendations) return [];
  return BEHAVIOR_LIBRARY.filter(
    (item) =>
      !ctx.snoozedIds.includes(item.id) &&
      !ctx.declinedIds.includes(item.id) &&
      !ctx.excludeIds?.includes(item.id),
  )
    .map((item) => scoreCandidate(item, ctx))
    .sort((a, b) => b.score - a.score);
}

export function pickRepeatOne(ctx: RankContext): RankedBehavior | null {
  const walk = ctx.associations.find((a) => a.behaviorId === "evening-walk");
  if (!walk || walk.direction !== "positive" || walk.sampleSize < 8) return null;
  if (ctx.snoozedIds.includes("evening-walk")) return null;
  const ranked = scoreCandidate(
    BEHAVIOR_LIBRARY.find((item) => item.id === "evening-walk")!,
    ctx,
  );
  return ranked;
}

export function replaceCandidates(ctx: RankContext, currentId: string): RankedBehavior[] {
  return rankTodayOne({ ...ctx, excludeIds: [...(ctx.excludeIds ?? []), currentId] }).slice(0, 3);
}
