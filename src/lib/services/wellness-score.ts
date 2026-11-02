import type { Client } from "@libsql/client";
import { median } from "@/lib/math";
import { BASELINE_WINDOW_DAYS } from "@/lib/metrics";
import {
  circularMinuteDifference,
  dedupeBySourceId,
  HISTORY_WINDOW_DAYS,
  preferSource,
  scoreActivity,
  scoreNutrition,
  scoreRecovery,
  scoreSleep,
  type Coverage,
  type MealRecord,
} from "@/lib/services/pillar-components";
import { localDate, readProfile, sanitizeScoringGoals } from "@/lib/services/workspace";

/** Approved product weights. Integer percent points avoid binary rounding in the sum. */
export const PILLAR_WEIGHTS = {
  nutrition: 25,
  sleep: 30,
  activity: 25,
  recovery: 20,
} as const;

export const WELLNESS_ALGORITHM_VERSION = "wellness-v1.0";

/** Provisional. Confirmed for this implementation and kept as a named constant. */
export const MINIMUM_ELIGIBLE_PILLARS = 3;

/**
 * Provisional minimum count of persisted official scores before a personal comparison.
 * Matches the existing 28-day personal-baseline window. It is a history requirement, not a clinical cutoff.
 */
export const PERSONAL_BASELINE_MIN_SCORES = BASELINE_WINDOW_DAYS;

export const INSUFFICIENT_SCORE_MESSAGE = "Not enough data to calculate your Wellness Score.";
export const PERSONAL_BASELINE_MESSAGE = "Your personal baseline is still building.";
export const POPULATION_COMPARISON_MESSAGE = "Population comparison unavailable.";
export const SCORE_DISCLAIMER =
  "This is a nonclinical wellness indicator, not a diagnosis or a medically validated measurement.";

export const PILLAR_IDS = ["nutrition", "sleep", "activity", "recovery"] as const;
export type WellnessPillar = (typeof PILLAR_IDS)[number];

export type PillarScoreInput = {
  id: WellnessPillar;
  /** Null means missing. Zero is a real score and stays eligible. */
  score: number | null;
  records: number;
  inputRefs: string[];
  sources: string[];
  explanation?: string;
};

export type ScoreHistoryPoint = {
  exactScore: number;
  scoreDate: string;
};

export type AggregateInput = {
  pillars: PillarScoreInput[];
  userId: string;
  scoreDate: string;
  calculatedAt: string;
  history: ScoreHistoryPoint[];
};

export type WellnessAssessment = {
  ok: true;
  status: "scored" | "insufficient";
  exactScore: number | null;
  displayScore: number | null;
  message: string;
  detail: string;
  algorithmVersion: string;
  disclaimer: string;
  eligiblePillars: WellnessPillar[];
  appliedWeights: Partial<Record<WellnessPillar, number>>;
  weightSum: number;
  pillars: Array<{
    id: WellnessPillar;
    score: number | null;
    eligible: boolean;
    weight: number;
    records: number;
    explanation: string;
  }>;
  personalComparison: {
    state: "building" | "ready";
    message: string;
    delta: number | null;
    historyCount: number;
  };
  populationComparison: {
    state: "unavailable";
    message: string;
  };
  labsAffectScore: false;
  cycleAffectsScore: false;
  provenance: {
    userId: string;
    scoreDate: string;
    algorithmVersion: string;
    eligiblePillars: WellnessPillar[];
    pillarScores: Partial<Record<WellnessPillar, number | null>>;
    appliedWeights: Partial<Record<WellnessPillar, number>>;
    canonicalInputRefs: string[];
    sources: string[];
    calculatedAt: string;
  };
};

export type AggregateFailure = { ok: false; error: string };

const PILLAR_LABEL: Record<WellnessPillar, string> = {
  nutrition: "Nutrition",
  sleep: "Sleep",
  activity: "Activity",
  recovery: "Recovery",
};

function isPillar(value: string): value is WellnessPillar {
  return (PILLAR_IDS as readonly string[]).includes(value);
}

export function aggregateWellness(input: AggregateInput): WellnessAssessment | AggregateFailure {
  const seen = new Set<string>();
  for (const pillar of input.pillars) {
    if (!isPillar(pillar.id)) return { ok: false, error: "Unknown pillar." };
    if (seen.has(pillar.id)) return { ok: false, error: "Each pillar can be supplied once." };
    seen.add(pillar.id);
    if (pillar.score == null) continue;
    if (!Number.isFinite(pillar.score) || pillar.score < 0 || pillar.score > 100) {
      return { ok: false, error: `${PILLAR_LABEL[pillar.id]} score must be between 0 and 100, or missing.` };
    }
  }

  const byId = new Map(input.pillars.map((pillar) => [pillar.id, pillar]));
  const eligible = PILLAR_IDS.filter((id) => byId.get(id)?.score != null);
  const appliedWeights: Partial<Record<WellnessPillar, number>> = {};
  let weighted = 0;
  let weightSum = 0;
  for (const id of eligible) {
    const weight = PILLAR_WEIGHTS[id];
    const score = byId.get(id)?.score;
    if (score == null) continue;
    appliedWeights[id] = weight;
    weighted += score * weight;
    weightSum += weight;
  }

  const exactScore = eligible.length >= MINIMUM_ELIGIBLE_PILLARS && weightSum > 0 ? weighted / weightSum : null;
  const displayScore = exactScore == null ? null : Math.round(exactScore);
  const sources = [...new Set(input.pillars.flatMap((pillar) => pillar.sources))];
  const history = input.history.filter((point) => Number.isFinite(point.exactScore));
  const medianScore = history.length >= PERSONAL_BASELINE_MIN_SCORES ? median(history.map((point) => point.exactScore)) : null;
  const delta = exactScore != null && medianScore != null ? Math.round((exactScore - medianScore) * 10) / 10 : null;

  const pillars = PILLAR_IDS.map((id) => {
    const pillar = byId.get(id);
    const score = pillar?.score ?? null;
    const records = pillar?.records ?? 0;
    const eligiblePillar = score != null;
    const explanation = eligiblePillar
      ? `${PILLAR_LABEL[id]} score ${score} is eligible. Weight ${PILLAR_WEIGHTS[id]}%.`
      : pillar?.explanation ?? (records > 0
        ? `${records} ${PILLAR_LABEL[id].toLowerCase()} record${records === 1 ? "" : "s"} saved. This pillar is not eligible yet.`
        : `No ${PILLAR_LABEL[id].toLowerCase()} records yet.`);
    return { id, score, eligible: eligiblePillar, weight: PILLAR_WEIGHTS[id], records, explanation };
  });

  return {
    ok: true,
    status: exactScore == null ? "insufficient" : "scored",
    exactScore,
    displayScore,
    message: exactScore == null ? INSUFFICIENT_SCORE_MESSAGE : "Wellness Score",
    detail:
      exactScore == null
        ? "At least three eligible pillar scores are required. A pillar is eligible only when every one of its components can be scored. Missing inputs stay missing."
        : "Weights of the eligible pillars are renormalized. This number is not a diagnosis.",
    algorithmVersion: WELLNESS_ALGORITHM_VERSION,
    disclaimer: SCORE_DISCLAIMER,
    eligiblePillars: eligible,
    appliedWeights,
    weightSum,
    pillars,
    personalComparison: {
      state: delta == null ? "building" : "ready",
      message: delta == null ? PERSONAL_BASELINE_MESSAGE : `Compared with the median of ${history.length} saved scores, the difference is ${delta}.`,
      delta,
      historyCount: history.length,
    },
    populationComparison: {
      state: "unavailable",
      message: POPULATION_COMPARISON_MESSAGE,
    },
    labsAffectScore: false,
    cycleAffectsScore: false,
    provenance: {
      userId: input.userId,
      scoreDate: input.scoreDate,
      algorithmVersion: WELLNESS_ALGORITHM_VERSION,
      eligiblePillars: eligible,
      pillarScores: Object.fromEntries(PILLAR_IDS.map((id) => [id, byId.get(id)?.score ?? null])),
      appliedWeights,
      canonicalInputRefs: input.pillars.flatMap((pillar) => pillar.inputRefs),
      sources,
      calculatedAt: input.calculatedAt,
    },
  };
}

type TimedRow = {
  id: string;
  source: string;
  sourceRecordId: string | null;
  start: string;
  end: string | null;
  amount: number;
};

function shiftDate(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

function clockMinutes(iso: string, timeZone: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  let hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour === 24) hour = 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function bedtimeMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function overlaps(rows: TimedRow[]): boolean {
  const ordered = [...rows].sort((left, right) => left.start.localeCompare(right.start) || left.id.localeCompare(right.id));
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous && current && previous.end && previous.end > current.start) return true;
  }
  return false;
}

function asMinutes(coverage: Coverage<{ hours: number; start: string }>): Coverage<number> {
  if (coverage.state !== "value") return coverage;
  return { state: "value", value: coverage.value.hours * 60, source: coverage.source };
}

function coverageFromSessions(rows: TimedRow[], mode: "single" | "sum"): Coverage<{ hours: number; start: string }> {
  const unique = dedupeBySourceId(rows);
  if (unique.length === 0) return { state: "missing" };
  if (mode === "single" && unique.length > 1) return { state: "invalid" };
  if (overlaps(unique)) return { state: "invalid" };
  const first = [...unique].sort((left, right) => left.start.localeCompare(right.start) || left.id.localeCompare(right.id))[0];
  if (!first) return { state: "missing" };
  const hours = mode === "single" ? first.amount : unique.reduce((sum, row) => sum + row.amount, 0);
  return { state: "value", value: { hours, start: first.start }, source: first.source };
}

export async function pillarsForStoredDay(client: Client, userId: string, scoreDate: string, timeZone: string): Promise<PillarScoreInput[]> {
  const profile = await readProfile(client, userId);
  let workspace: { scoringGoals?: unknown } = {};
  try {
    workspace = JSON.parse(profile?.workspace_json || "{}") as { scoringGoals?: unknown };
  } catch {
    workspace = {};
  }
  const goals = sanitizeScoringGoals(workspace.scoringGoals);
  const bedtime = bedtimeMinutes(profile?.typical_bedtime ?? null);
  const meals = await client.execute({
    sql: "SELECT id, calories, source, source_record_id FROM meal_log WHERE user_id = ? AND logged_on = ?",
    args: [userId, scoreDate],
  });
  const hydration = await client.execute({
    sql: "SELECT id, milliliters, source, source_record_id FROM hydration_log WHERE user_id = ? AND logged_on = ?",
    args: [userId, scoreDate],
  });
  const target = await client.execute({ sql: "SELECT milliliters FROM hydration_target WHERE user_id = ?", args: [userId] });
  const sleep = await client.execute({
    sql: "SELECT id, duration_hours, source, source_record_id, start_time, end_time FROM sleep_log WHERE user_id = ?",
    args: [userId],
  });
  const workouts = await client.execute({
    sql: "SELECT id, minutes, source, source_record_id, started_at FROM workout_log WHERE user_id = ?",
    args: [userId],
  });
  const recovery = await client.execute({
    sql: "SELECT id, energy, fatigue, soreness, updated_at FROM recovery_log WHERE user_id = ? AND logged_on = ?",
    args: [userId, scoreDate],
  });
  const measurements = await client.execute({
    sql: "SELECT id, metric, value, start_time, end_time, source_record_id FROM measurement WHERE user_id = ?",
    args: [userId],
  });
  const manualSleep = sleep.rows.map((row) => ({
    id: String(row.id),
    source: String(row.source ?? "manual"),
    sourceRecordId: row.source_record_id == null ? null : String(row.source_record_id),
    start: String(row.start_time),
    end: String(row.end_time),
    amount: Number(row.duration_hours),
    day: localDate(String(row.start_time), timeZone),
  }));
  const manualWork = workouts.rows.map((row) => {
    const start = String(row.started_at);
    const minutes = Number(row.minutes);
    return {
      id: String(row.id),
      source: String(row.source ?? "manual"),
      sourceRecordId: row.source_record_id == null ? null : String(row.source_record_id),
      start,
      end: new Date(new Date(start).getTime() + minutes * 60000).toISOString(),
      amount: minutes / 60,
      day: localDate(start, timeZone),
    };
  });
  const companion = measurements.rows
    .map((row) => ({
      id: String(row.id),
      source: "companion",
      sourceRecordId: String(row.source_record_id),
      metric: String(row.metric),
      amount: Number(row.value),
      start: String(row.start_time),
      end: row.end_time == null ? null : String(row.end_time),
      day: localDate(String(row.start_time), timeZone),
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
    .filter((row, index, all) => all.findIndex((item) => item.metric === row.metric && item.sourceRecordId === row.sourceRecordId) === index);

  const sleepOn = (day: string): Coverage<{ hours: number; start: string }> => {
    const manual = coverageFromSessions(manualSleep.filter((row) => row.day === day), "single");
    const nights = companion.filter((row) => row.day === day && row.metric === "sleep_hours");
    const wearable = coverageFromSessions(
      nights.map((row) => ({ ...row, end: row.end ?? new Date(new Date(row.start).getTime() + row.amount * 3600000).toISOString() })),
      "single",
    );
    return preferSource(manual, wearable, goals.sources.sleep);
  };
  const activityOn = (day: string): Coverage<number> => {
    if (goals.activityKind == null) return { state: "missing" };
    if (goals.activityKind === "steps") {
      const steps = companion.filter((row) => row.day === day && row.metric === "steps");
      const wearable: Coverage<number> = steps.length === 0
        ? { state: "missing" }
        : { state: "value", value: steps.reduce((sum, row) => sum + row.amount, 0), source: "companion" };
      return preferSource({ state: "missing" }, wearable, goals.sources.activity);
    }
    const manual = coverageFromSessions(manualWork.filter((row) => row.day === day), "sum");
    const minutes = companion.filter((row) => row.day === day && row.metric === "active_minutes");
    const wearable = coverageFromSessions(
      minutes.map((row) => ({
        ...row,
        amount: row.amount / 60,
        end: row.end ?? new Date(new Date(row.start).getTime() + row.amount * 60000).toISOString(),
      })),
      "sum",
    );
    return preferSource(asMinutes(manual), asMinutes(wearable), goals.sources.activity);
  };

  const drinks = dedupeBySourceId(hydration.rows.map((row) => ({
    id: String(row.id),
    source: String(row.source ?? "manual"),
    sourceRecordId: row.source_record_id == null ? null : String(row.source_record_id),
    milliliters: Number(row.milliliters),
  })));
  const manualDrinks = drinks.filter((row) => row.source !== "companion");
  const wearableDrinks = drinks.filter((row) => row.source === "companion");
  const drinkCoverage = preferSource<number>(
    manualDrinks.length === 0 ? { state: "missing" } : { state: "value", value: manualDrinks.reduce((sum, row) => sum + row.milliliters, 0), source: "manual" },
    wearableDrinks.length === 0 ? { state: "missing" } : { state: "value", value: wearableDrinks.reduce((sum, row) => sum + row.milliliters, 0), source: "companion" },
    goals.sources.hydration,
  );
  const mealRecords: MealRecord[] = meals.rows.map((row) => ({
    id: String(row.id),
    source: String(row.source ?? "manual"),
    sourceRecordId: row.source_record_id == null ? null : String(row.source_record_id),
    calories: row.calories == null ? null : Number(row.calories),
  }));
  const nutrition = scoreNutrition({
    mealTarget: goals.mealTarget,
    meals: mealRecords,
    calorieGoal: goals.calorieGoal,
    hydrationMilliliters: drinkCoverage.state === "value" ? drinkCoverage.value : null,
    hydrationGoal: target.rows[0] ? Number(target.rows[0].milliliters) : null,
    hydrationConflict: drinkCoverage.state === "invalid",
  });
  const tonight = sleepOn(scoreDate);
  const deviations: number[] = [];
  if (bedtime != null) {
    for (let offset = 1; offset <= HISTORY_WINDOW_DAYS; offset += 1) {
      const night = sleepOn(shiftDate(scoreDate, -offset));
      if (night.state !== "value") continue;
      const start = clockMinutes(night.value.start, timeZone);
      if (start == null) continue;
      deviations.push(circularMinuteDifference(start, bedtime));
    }
  }
  const sleepScore = scoreSleep({
    goalHours: goals.sleepHoursGoal,
    hours: tonight.state === "value" ? tonight.value.hours : null,
    deviationMinutes: deviations,
    blocked: tonight.state === "invalid",
  });
  const todayActivity = activityOn(scoreDate);
  const history = Array.from({ length: HISTORY_WINDOW_DAYS }, (_, index) => {
    const day = activityOn(shiftDate(scoreDate, -(index + 1)));
    return day.state === "value" ? day.value : null;
  });
  const activity = scoreActivity({
    goal: goals.activityKind == null ? null : goals.activityGoal,
    recorded: todayActivity.state === "value" ? todayActivity.value : null,
    history,
    conflict: todayActivity.state === "invalid",
  });
  const recoveryScore = scoreRecovery(recovery.rows.map((row) => ({
    id: String(row.id),
    at: String(row.updated_at),
    energy: row.energy == null ? null : Number(row.energy),
    fatigue: row.fatigue == null ? null : Number(row.fatigue),
    soreness: row.soreness == null ? null : Number(row.soreness),
  })));
  const sources = [
    drinkCoverage.state === "value" ? drinkCoverage.source : null,
    tonight.state === "value" ? tonight.source : null,
    todayActivity.state === "value" ? todayActivity.source : null,
  ].filter((source): source is string => source != null);
  const built = [
    ["nutrition", nutrition, mealRecords.length + drinks.length, drinks.map((row) => row.id)],
    ["sleep", sleepScore, tonight.state === "missing" ? 0 : 1, tonight.state === "value" ? [tonight.value.start] : []],
    ["activity", activity, todayActivity.state === "value" ? 1 : 0, [] as string[]],
    ["recovery", recoveryScore, recovery.rows.length, recovery.rows.map((row) => String(row.id))],
  ] satisfies ReadonlyArray<readonly [WellnessPillar, { score: number | null; explanation: string }, number, string[]]>;
  return built.map(([id, result, records, inputRefs]) => ({
    id,
    score: result.score,
    records,
    inputRefs,
    sources,
    explanation: result.explanation,
  }));
}

export async function listOfficialScores(client: Client, userId: string): Promise<ScoreHistoryPoint[]> {
  const result = await client.execute({
    sql: `SELECT exact_score, score_date FROM wellness_score
          WHERE user_id = ? AND algorithm_version = ?
          ORDER BY score_date ASC`,
    args: [userId, WELLNESS_ALGORITHM_VERSION],
  });
  return result.rows.map((row) => ({
    exactScore: Number(row.exact_score),
    scoreDate: String(row.score_date),
  }));
}

export async function refreshOfficialScore(client: Client, userId: string) {
  const profile = await readProfile(client, userId);
  const calculatedAt = new Date().toISOString();
  const timeZone = profile?.timezone || "UTC";
  return assessStoredWellness(client, {
    userId,
    scoreDate: localDate(calculatedAt, timeZone),
    calculatedAt,
    timeZone,
  });
}

export async function assessStoredWellness(
  client: Client,
  input: { userId: string; scoreDate: string; calculatedAt: string; timeZone: string },
): Promise<WellnessAssessment | AggregateFailure> {
  const history = await listOfficialScores(client, input.userId);
  const assessment = aggregateWellness({
    pillars: await pillarsForStoredDay(client, input.userId, input.scoreDate, input.timeZone),
    userId: input.userId,
    scoreDate: input.scoreDate,
    calculatedAt: input.calculatedAt,
    history,
  });
  if (!assessment.ok) return assessment;
  await saveOfficialScore(client, assessment);
  return assessment;
}

export async function saveOfficialScore(client: Client, assessment: WellnessAssessment): Promise<{ saved: boolean }> {
  const { userId, scoreDate, calculatedAt } = assessment.provenance;
  if (assessment.exactScore == null || assessment.displayScore == null) {
    await client.execute({
      sql: "DELETE FROM wellness_score WHERE user_id = ? AND score_date = ? AND algorithm_version = ?",
      args: [userId, scoreDate, WELLNESS_ALGORITHM_VERSION],
    });
    return { saved: false };
  }
  await client.execute({
    sql: `INSERT INTO wellness_score (
            id, user_id, score_date, exact_score, display_score, algorithm_version, provenance_json, calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, score_date, algorithm_version) DO UPDATE SET
            exact_score = excluded.exact_score,
            display_score = excluded.display_score,
            provenance_json = excluded.provenance_json,
            calculated_at = excluded.calculated_at`,
    args: [
      `${userId}:${scoreDate}:${WELLNESS_ALGORITHM_VERSION}`,
      userId,
      scoreDate,
      assessment.exactScore,
      assessment.displayScore,
      WELLNESS_ALGORITHM_VERSION,
      JSON.stringify(assessment.provenance),
      calculatedAt,
    ],
  });
  return { saved: true };
}
