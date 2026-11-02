import { median } from "@/lib/math";

export const NUTRITION_COMPONENT_WEIGHTS = {
  mealConsistency: 40,
  nutritionGoal: 35,
  hydration: 25,
} as const;

export const SLEEP_COMPONENT_WEIGHTS = {
  duration: 70,
  consistency: 30,
} as const;

export const ACTIVITY_COMPONENT_WEIGHTS = {
  goal: 70,
  consistency: 30,
} as const;

export const RECOVERY_COMPONENT_WEIGHTS = {
  energy: 40,
  fatigue: 30,
  soreness: 30,
} as const;

export const SLEEP_DEVIATION_BOUNDARY_MINUTES = 120;
export const HISTORY_WINDOW_DAYS = 7;
export const MIN_HISTORY_DAYS = 4;

export type SourceName = "manual" | "companion";
export type ComponentScore = {
  id: string;
  weight: number;
  score: number | null;
  reason: string;
};
export type PillarComponents = {
  score: number | null;
  components: ComponentScore[];
  explanation: string;
};
export type Coverage<T> = { state: "value"; value: T; source: string } | { state: "missing" } | { state: "invalid" };
export type MealRecord = { id: string; source: string; sourceRecordId: string | null; calories: number | null };
export type CheckIn = { id: string; at: string; energy: number | null; fatigue: number | null; soreness: number | null };

function shown(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function pack(components: ComponentScore[]): PillarComponents {
  const ready = components.every((component) => component.score != null);
  const weight = components.reduce((sum, component) => sum + component.weight, 0);
  const score = ready && weight > 0
    ? components.reduce((sum, component) => sum + (component.score as number) * component.weight, 0) / weight
    : null;
  return { score, components, explanation: components.map((component) => component.reason).join(" ") };
}

export function dedupeBySourceId<T extends { id: string; source: string; sourceRecordId: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const row of [...rows].sort((a, b) => a.id.localeCompare(b.id))) {
    const key = row.sourceRecordId ? `${row.source}:${row.sourceRecordId}` : `row:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  return kept;
}

export function preferSource<T>(manual: Coverage<T>, companion: Coverage<T>, preference: SourceName | null): Coverage<T> {
  if (preference == null) {
    if (manual.state === "value" && companion.state === "value") return { state: "invalid" };
    if (manual.state === "value") return manual;
    if (companion.state === "value") return companion;
    if (manual.state === "invalid" || companion.state === "invalid") return { state: "invalid" };
    return { state: "missing" };
  }
  const first = preference === "manual" ? manual : companion;
  const second = preference === "manual" ? companion : manual;
  if (first.state === "value") return first;
  if (second.state === "value") return second;
  if (first.state === "invalid" || second.state === "invalid") return { state: "invalid" };
  return { state: "missing" };
}

export function mealAdherence(loggedMeals: number, mealTarget: number | null): number | null {
  if (mealTarget == null || !Number.isInteger(mealTarget) || mealTarget < 1 || mealTarget > 6) return null;
  if (!Number.isInteger(loggedMeals) || loggedMeals < 0) return null;
  return Math.min(100, (loggedMeals / mealTarget) * 100);
}

export function calorieAdherence(recordedCalories: number | null, calorieGoal: number | null): number | null {
  if (recordedCalories == null || calorieGoal == null) return null;
  if (!Number.isFinite(recordedCalories) || !Number.isFinite(calorieGoal) || recordedCalories < 0 || calorieGoal <= 0) return null;
  return 100 * Math.max(0, 1 - Math.abs(recordedCalories - calorieGoal) / calorieGoal);
}

export function goalProgress(actual: number | null, goal: number | null): number | null {
  if (actual == null || goal == null) return null;
  if (!Number.isFinite(actual) || !Number.isFinite(goal) || actual < 0 || goal <= 0) return null;
  return Math.min(100, (actual / goal) * 100);
}

export function scaleCheckIn(value: number | null, reverse: boolean): number | null {
  if (value == null || !Number.isFinite(value) || value < 0 || value > 10) return null;
  return ((reverse ? 10 - value : value) / 10) * 100;
}

export function circularMinuteDifference(left: number, right: number): number {
  const span = Math.abs(left - right) % 1440;
  return Math.min(span, 1440 - span);
}

export function sleepDurationScore(hours: number | null, goalHours: number | null): number | null {
  return goalProgress(hours, goalHours);
}

export function sleepConsistencyScore(deviationMinutes: number[]): number | null {
  if (deviationMinutes.length < MIN_HISTORY_DAYS) return null;
  if (deviationMinutes.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const middle = median(deviationMinutes);
  if (middle == null) return null;
  return 100 * Math.max(0, 1 - middle / SLEEP_DEVIATION_BOUNDARY_MINUTES);
}

export function activityGoalScore(recorded: number | null, goal: number | null): number | null {
  return goalProgress(recorded, goal);
}

export function activityConsistencyScore(history: Array<number | null>, goal: number | null): number | null {
  if (goal == null || !Number.isFinite(goal) || goal <= 0) return null;
  const observed = history.filter((value): value is number => value != null && Number.isFinite(value) && value >= 0);
  if (observed.length < MIN_HISTORY_DAYS) return null;
  const met = observed.filter((value) => value >= goal).length;
  return (100 * met) / observed.length;
}

export function scoreNutrition(input: {
  mealTarget: number | null;
  meals: MealRecord[];
  calorieGoal: number | null;
  hydrationMilliliters: number | null;
  hydrationGoal: number | null;
  hydrationConflict: boolean;
}): PillarComponents {
  const meals = dedupeBySourceId(input.meals);
  const mealScore = mealAdherence(meals.length, input.mealTarget);
  const diaryComplete = mealScore != null && input.mealTarget != null && meals.length >= input.mealTarget && meals.every((meal) => meal.calories != null && meal.calories >= 0);
  const calorieScore = diaryComplete
    ? calorieAdherence(meals.reduce((sum, meal) => sum + (meal.calories ?? 0), 0), input.calorieGoal)
    : null;
  let hydration: ComponentScore;
  if (input.hydrationConflict) {
    hydration = { id: "hydration", weight: NUTRITION_COMPONENT_WEIGHTS.hydration, score: null, reason: "Hydration is unavailable because manual and wearable drinks both exist and no preferred source is set." };
  } else if (input.hydrationGoal == null || input.hydrationGoal <= 0) {
    hydration = { id: "hydration", weight: NUTRITION_COMPONENT_WEIGHTS.hydration, score: null, reason: "Hydration is unavailable until a hydration target is saved." };
  } else if (input.hydrationMilliliters == null) {
    hydration = { id: "hydration", weight: NUTRITION_COMPONENT_WEIGHTS.hydration, score: null, reason: "Hydration is unavailable. No drinks were logged, and a missing log is not counted as zero." };
  } else {
    const score = goalProgress(input.hydrationMilliliters, input.hydrationGoal);
    hydration = { id: "hydration", weight: NUTRITION_COMPONENT_WEIGHTS.hydration, score, reason: `Hydration goal progress is ${shown(score ?? 0)}. This uses logged drinks only.` };
  }
  return pack([
    {
      id: "mealConsistency",
      weight: NUTRITION_COMPONENT_WEIGHTS.mealConsistency,
      score: mealScore,
      reason: mealScore == null
        ? "Meal logging is unavailable until you set a daily meal target from 1 to 6. This measures tracking, not meal quality."
        : `Meal logging is ${shown(mealScore)}. ${meals.length} distinct meals are counted against a target of ${input.mealTarget}. This measures tracking, not meal quality.`,
    },
    {
      id: "nutritionGoal",
      weight: NUTRITION_COMPONENT_WEIGHTS.nutritionGoal,
      score: calorieScore,
      reason: calorieScore == null
        ? "Calorie progress is unavailable until the meal target is met and every counted meal has calories."
        : `Calorie progress is ${shown(calorieScore)} against the saved calorie target.`,
    },
    hydration,
  ]);
}

export function scoreSleep(input: { goalHours: number | null; hours: number | null; deviationMinutes: number[]; blocked?: boolean }): PillarComponents {
  const duration = input.blocked ? null : sleepDurationScore(input.hours, input.goalHours);
  const consistency = input.goalHours == null ? null : sleepConsistencyScore(input.deviationMinutes);
  const durationReason = input.blocked
    ? "Sleep duration is unavailable because the sessions overlap or both sources are present. Sessions are not merged or added."
    : input.goalHours == null
      ? "Sleep duration is unavailable until you save a positive duration goal."
      : input.hours == null
        ? "Sleep duration is unavailable because there is not one valid sleep record. A missing night is not counted as zero."
        : `Sleep duration is ${shown(duration ?? 0)} against the saved goal.`;
  return pack([
    {
      id: "duration",
      weight: SLEEP_COMPONENT_WEIGHTS.duration,
      score: duration,
      reason: durationReason,
    },
    {
      id: "consistency",
      weight: SLEEP_COMPONENT_WEIGHTS.consistency,
      score: consistency,
      reason: consistency == null
        ? `Sleep consistency needs at least ${MIN_HISTORY_DAYS} valid nights in the previous ${HISTORY_WINDOW_DAYS} completed days, plus a target bedtime.`
        : `Sleep consistency is ${shown(consistency)} from ${input.deviationMinutes.length} nights. The deviation boundary is ${SLEEP_DEVIATION_BOUNDARY_MINUTES} minutes.`,
    },
  ]);
}

export function scoreActivity(input: {
  goal: number | null;
  recorded: number | null;
  history: Array<number | null>;
  conflict: boolean;
}): PillarComponents {
  const recorded = input.conflict ? null : input.recorded;
  const goal = activityGoalScore(recorded, input.goal);
  const consistency = input.goal == null ? null : activityConsistencyScore(input.history, input.goal);
  const goalReason = input.conflict
    ? "Activity is unavailable because manual and wearable totals are not added together."
    : input.goal == null
      ? "Activity is unavailable until you choose steps or active minutes and save a positive goal."
      : goal == null
        ? "Activity is unavailable because no valid activity was recorded. Missing data is not treated as zero."
        : `Activity goal progress is ${shown(goal)}. Extra activity does not score above 100.`;
  return pack([
    {
      id: "goal",
      weight: ACTIVITY_COMPONENT_WEIGHTS.goal,
      score: goal,
      reason: goalReason,
    },
    {
      id: "consistency",
      weight: ACTIVITY_COMPONENT_WEIGHTS.consistency,
      score: consistency,
      reason: consistency == null
        ? `Movement consistency needs at least ${MIN_HISTORY_DAYS} covered days in the previous ${HISTORY_WINDOW_DAYS} completed days.`
        : `Movement consistency is ${shown(consistency)}. Days without data are left out.`,
    },
  ]);
}

export function latestCompleteCheckIn(rows: CheckIn[]): CheckIn | null {
  const complete = rows.filter((row) => row.energy != null && row.fatigue != null && row.soreness != null);
  complete.sort((left, right) => (left.at === right.at ? left.id.localeCompare(right.id) : right.at.localeCompare(left.at)));
  return complete[0] ?? null;
}

export function scoreRecovery(rows: CheckIn[]): PillarComponents {
  const chosen = latestCompleteCheckIn(rows);
  const energy = scaleCheckIn(chosen?.energy ?? null, false);
  const fatigue = scaleCheckIn(chosen?.fatigue ?? null, true);
  const soreness = chosen?.soreness == null ? null : scaleCheckIn(chosen.soreness, true);
  return pack([
    {
      id: "energy",
      weight: RECOVERY_COMPONENT_WEIGHTS.energy,
      score: energy,
      reason: energy == null ? "Energy is unavailable until a complete check-in includes it." : `Energy is ${shown(energy)} from the latest complete check-in.`,
    },
    {
      id: "fatigue",
      weight: RECOVERY_COMPONENT_WEIGHTS.fatigue,
      score: fatigue,
      reason: fatigue == null ? "Fatigue is unavailable until a complete check-in includes it." : `Fatigue is ${shown(fatigue)} after reversing the 0–10 rating.`,
    },
    {
      id: "soreness",
      weight: RECOVERY_COMPONENT_WEIGHTS.soreness,
      score: soreness,
      reason: soreness == null ? "Soreness is unavailable. Stress is stored separately and is not used as soreness." : `Soreness is ${shown(soreness)} from the 0–10 rating.`,
    },
  ]);
}
