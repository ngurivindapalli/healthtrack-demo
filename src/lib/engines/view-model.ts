import { BEHAVIOR_LIBRARY, getBehavior } from "@/lib/behaviors";
import { allAssociations } from "@/lib/engines/associations";
import { snapshotMetric } from "@/lib/engines/baseline";
import { pickRepeatOne, rankTodayOne } from "@/lib/engines/behaviors";
import { companionFreshness, syncRecencyHours, type FreshnessView } from "@/lib/engines/freshness";
import { computeWellnessStatus } from "@/lib/engines/status";
import { METRIC_LIST, METRICS, PILLAR_COPY } from "@/lib/metrics";
import { DEMO_NOW, DEMO_TODAY } from "@/lib/metrics";
import type {
  AssociationResult,
  DailyObservation,
  DemoState,
  MetricSnapshot,
  PillarId,
  RankedBehavior,
  TrendItem,
  WellnessStatusResult,
} from "@/lib/types";

export interface PillarView {
  id: PillarId;
  title: string;
  question: string;
  directionLabel: string;
  summary: string;
  deviation: number;
  snapshots: MetricSnapshot[];
}

export interface AppModel {
  asOf: string;
  observations: DailyObservation[];
  status: WellnessStatusResult;
  pillars: PillarView[];
  todayOne: RankedBehavior | null;
  repeatOne: RankedBehavior | null;
  replacements: RankedBehavior[];
  associations: AssociationResult[];
  trends: TrendItem[];
  coldStart: boolean;
  sampleData: boolean;
  freshness: FreshnessView;
}

function observationsFor(state: DemoState): DailyObservation[] {
  return overlayToday(state.persistedObservations ?? [], state);
}

function overlayToday(
  observations: DailyObservation[],
  state: DemoState,
): DailyObservation[] {
  if (observations.length === 0) return observations;
  const next = observations.map((row) => ({ ...row }));
  const last = next[next.length - 1];
  if (!last) return next;
  if (state.todayEnergy != null) last.energy = state.todayEnergy;
  if (state.todayStress != null) last.stress = state.todayStress;
  last.travel = state.context.travel;
  last.illness = state.context.illness;
  last.unusualSchedule = state.context.unusualSchedule;
  if (state.todayCommitment?.behaviorId === "evening-walk") {
    if (state.todayCommitment.decision === "completed") {
      last.eveningWalkMinutes = 20;
    }
  }
  return next;
}

function pillarDirection(deviation: number): string {
  if (deviation >= 0.45) return "Below your baseline";
  if (deviation >= 0.22) return "Slightly off your baseline";
  if (deviation <= 0.08) return "Near your baseline";
  return "Mostly near your baseline";
}

export function buildAppModel(state: DemoState): AppModel {
  const asOf = state.dataAsOf || DEMO_TODAY;
  const nowIso = state.nowIso || DEMO_NOW;
  const observations = observationsFor(state);
  const activeDevices = (state.devices ?? []).filter((device) => device.status === "active");
  const lastSyncAt = activeDevices
    .map((device) => device.lastSyncAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const connectedCount = activeDevices.length;
  const coldStart = observations.length < 8;

  const status = computeWellnessStatus({
    observations: observations.length
      ? observations
      : [
          {
            date: asOf,
            sleepHours: null,
            sleepEfficiency: null,
            bedtimeMinutes: null,
            rhr: null,
            hrv: null,
            steps: null,
            activeMinutes: null,
            energy: state.todayEnergy,
            stress: state.todayStress,
            lastMealHour: null,
            proteinBreakfast: null,
            eveningWalkMinutes: null,
            sources: [],
            travel: state.context.travel,
            illness: state.context.illness,
            unusualSchedule: state.context.unusualSchedule,
          },
        ],
    asOf,
    sex: state.profile.sex,
    labs: state.labReports,
    context: state.context,
    sourcesConnected: connectedCount,
    recencyHours: syncRecencyHours(lastSyncAt, nowIso),
  });

  const associations = observations.length ? allAssociations(observations) : [];
  const rankCtx = {
    status,
    associations,
    labs: state.labReports,
    context: state.context,
    safety: status.safety,
    snoozedIds: state.snoozedBehaviorIds,
    declinedIds: state.declinedBehaviorIds,
    preferenceIds: state.profile.goals.includes("Recovery")
      ? ["normal-bedtime"]
      : [],
  };

  const repeatOne = pickRepeatOne(rankCtx);
  const ranked = rankTodayOne({
    ...rankCtx,
    excludeIds: repeatOne ? [repeatOne.candidate.id] : [],
  });
  let todayOne = observations.length === 0 ? null : ranked[0] ?? null;
  if (observations.length > 0 && state.todayCommitment?.replacedWithId) {
    const replaced = BEHAVIOR_LIBRARY.find(
      (item) => item.id === state.todayCommitment?.replacedWithId,
    );
    todayOne =
      ranked.find((item) => item.candidate.id === replaced?.id) ??
      (replaced
        ? {
            candidate: replaced,
            score: 0,
            relevance: 0.5,
            evidence: 0.3,
            expectedBenefit: 0.4,
            feasibility: 0.7,
            confidence: 0.4,
            preference: 0.8,
            penalty: 0.3,
            why: replaced.whyShort,
            evidenceNote: "You chose this as a replacement for today's original ONE.",
          }
        : todayOne);
  } else if (state.todayCommitment?.behaviorId && todayOne) {
    const locked = ranked.find(
      (item) => item.candidate.id === state.todayCommitment?.behaviorId,
    );
    if (locked) todayOne = locked;
  }

  const replacements = ranked
    .filter((item) => item.candidate.id !== todayOne?.candidate.id)
    .slice(0, 3);

  const pillars: PillarView[] = (
    ["sleep", "recovery", "nutrition", "activity", "labs"] as const
  ).map((id) => {
    if (id === "labs") {
      const latest = state.labReports
        .slice()
        .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
      const a1c = latest?.results.find((item) => item.analyte === "HbA1c");
      return {
        id,
        title: PILLAR_COPY.labs.title,
        question: PILLAR_COPY.labs.question,
        directionLabel: a1c ? "HbA1c trending vs prior draw" : "No labs on file",
        summary: a1c
          ? `Most recent HbA1c ${a1c.value}% (${latest.collectedAt}). ${a1c.note}`
          : "No lab report is stored. Lab upload is not parsed in this version.",
        deviation: 0,
        snapshots: [],
      };
    }
    const domain = status.domains.find((item) => item.pillar === id);
    return {
      id,
      title: PILLAR_COPY[id].title,
      question: PILLAR_COPY[id].question,
      directionLabel: observations.length === 0 ? "No measurements yet" : pillarDirection(domain?.deviation ?? 0),
      summary:
        domain?.drivers
          .filter((d) => d.percentVsBaseline != null)
          .slice(0, 2)
          .map((d) => {
            const def = METRICS[d.metricId];
            const pct = Math.round((d.percentVsBaseline ?? 0) * 100);
            const sign = pct > 0 ? "+" : "";
            return `${def.shortLabel} ${sign}${pct}% vs your baseline`;
          })
          .join(" · ") || "Still gathering a personal baseline.",
      deviation: domain?.deviation ?? 0,
      snapshots: domain?.drivers ?? [],
    };
  });

  const trends: TrendItem[] = METRIC_LIST.map((def) => {
    const snap = snapshotMetric(observations, def.id, asOf, state.profile.sex);
    return {
      metricId: def.id,
      pillar: def.pillar,
      label: def.label,
      summary: snap.percentVsBaseline == null
        ? "Not enough recent values."
        : `${def.format(snap.recentMean ?? 0)} vs ${def.format(snap.baseline?.median ?? 0)} personal baseline.`,
      percentVsBaseline: snap.percentVsBaseline ?? 0,
      robustZ: snap.robustZ ?? 0,
      persistenceDays: snap.persistenceDays,
      confidence: snap.reliability,
      worseForWellness: snap.worseForWellness,
    };
  })
    .filter((item) => Math.abs(item.percentVsBaseline) >= 0.04 || item.worseForWellness)
    .sort((a, b) => {
      const aw = a.worseForWellness ? 1 : 0;
      const bw = b.worseForWellness ? 1 : 0;
      if (aw !== bw) return bw - aw;
      return Math.abs(b.percentVsBaseline) - Math.abs(a.percentVsBaseline);
    });

  return {
    asOf,
    observations,
    status,
    pillars,
    todayOne,
    repeatOne,
    replacements,
    associations,
    trends,
    coldStart,
    sampleData: false,
    freshness: companionFreshness(activeDevices.length > 0, lastSyncAt, nowIso),
  };
}

export function seriesFor(
  observations: DailyObservation[],
  metricId: keyof DailyObservation,
): { date: string; value: number | null }[] {
  return observations.map((row) => {
    const value = row[metricId];
    return {
      date: row.date,
      value: typeof value === "number" ? value : null,
    };
  });
}

export { getBehavior };
