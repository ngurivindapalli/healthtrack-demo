import { circularMinuteDifference, scoreActivity, scoreNutrition, scoreRecovery, scoreSleep } from "@/lib/services/pillar-components";
import { aggregateWellness, type WellnessAssessment } from "@/lib/services/wellness-score";
import type { WorkspacePayload } from "@/lib/services/workspace";
import type { AdherenceEvent, DailyObservation, Profile, ScoringGoals, WeeklyReflection } from "@/lib/types";

export type DemoLog = Record<string, unknown>;

export type DemoData = {
  workspace: WorkspacePayload;
  meals: DemoLog[];
  hydration: DemoLog[];
  hydrationTarget: number;
  sleep: DemoLog[];
  workouts: DemoLog[];
  recovery: DemoLog[];
  cycle: {
    consent: { enabled: number; typical_length_days: number; variability: string; life_context: string } | null;
    entries: DemoLog[];
  };
  scoreHistory: Array<{ exactScore: number; scoreDate: string }>;
};

function utcDay(offset = 0, now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function at(day: string, hours: number, minutes: number): string {
  return `${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00.000Z`;
}

type DemoDay = {
  sleepHours: number;
  bedtimeHour: number;
  bedtimeMinute: number;
  wakeHour: number;
  wakeMinute: number;
  steps: number;
  rhr: number;
  hrv: number;
  sleepEfficiency: number;
  activeMinutes: number;
  eveningWalkMinutes: number;
  workoutMinutes: number | null;
  workoutName: string | null;
  energy: number;
  stress: number;
  fatigue: number;
  soreness: number;
  lastMealHour: number;
  meals: Array<{ name: string; calories: number; hour: number; minute: number }>;
  drinks: number[];
};

/** Seven days, oldest first. The last row is the current UTC day. */
const DEMO_WEEK: DemoDay[] = [
  { sleepHours: 7.42, bedtimeHour: 22, bedtimeMinute: 18, wakeHour: 5, wakeMinute: 43, steps: 7842, rhr: 67, hrv: 51, sleepEfficiency: 85, activeMinutes: 22, eveningWalkMinutes: 18, workoutMinutes: 20, workoutName: "Easy walk", energy: 6, stress: 4, fatigue: 3, soreness: 2, lastMealHour: 19, meals: [{ name: "Oatmeal", calories: 420, hour: 8, minute: 0 }, { name: "Chicken salad", calories: 640, hour: 12, minute: 30 }, { name: "Salmon and potatoes", calories: 680, hour: 19, minute: 0 }], drinks: [800, 1100] },
  { sleepHours: 8.08, bedtimeHour: 22, bedtimeMinute: 5, wakeHour: 6, wakeMinute: 10, steps: 9215, rhr: 65, hrv: 58, sleepEfficiency: 89, activeMinutes: 34, eveningWalkMinutes: 28, workoutMinutes: 32, workoutName: "Brisk walk", energy: 7, stress: 3, fatigue: 2, soreness: 2, lastMealHour: 18.5, meals: [{ name: "Eggs and toast", calories: 480, hour: 7, minute: 40 }, { name: "Rice and vegetables", calories: 720, hour: 12, minute: 45 }, { name: "Stir fry", calories: 780, hour: 18, minute: 30 }], drinks: [900, 1400] },
  { sleepHours: 6.67, bedtimeHour: 23, bedtimeMinute: 10, wakeHour: 5, wakeMinute: 50, steps: 5638, rhr: 70, hrv: 43, sleepEfficiency: 79, activeMinutes: 8, eveningWalkMinutes: 0, workoutMinutes: null, workoutName: null, energy: 5, stress: 6, fatigue: 5, soreness: 3, lastMealHour: 20.25, meals: [{ name: "Yogurt and fruit", calories: 380, hour: 8, minute: 20 }, { name: "Sandwich", calories: 540, hour: 13, minute: 0 }, { name: "Pizza and salad", calories: 700, hour: 20, minute: 15 }], drinks: [600, 900] },
  { sleepHours: 7.83, bedtimeHour: 22, bedtimeMinute: 22, wakeHour: 6, wakeMinute: 12, steps: 10487, rhr: 64, hrv: 52, sleepEfficiency: 88, activeMinutes: 40, eveningWalkMinutes: 22, workoutMinutes: 38, workoutName: "Easy run", energy: 7, stress: 3, fatigue: 2, soreness: 4, lastMealHour: 19.25, meals: [{ name: "Oatmeal", calories: 510, hour: 7, minute: 50 }, { name: "Rice bowl", calories: 740, hour: 12, minute: 20 }, { name: "Chicken and rice", calories: 800, hour: 19, minute: 15 }], drinks: [1000, 1400] },
  { sleepHours: 7.25, bedtimeHour: 22, bedtimeMinute: 48, wakeHour: 6, wakeMinute: 3, steps: 8326, rhr: 66, hrv: 54, sleepEfficiency: 84, activeMinutes: 28, eveningWalkMinutes: 20, workoutMinutes: 26, workoutName: "Easy walk", energy: 6, stress: 4, fatigue: 3, soreness: 2, lastMealHour: 18.75, meals: [{ name: "Eggs and toast", calories: 450, hour: 8, minute: 10 }, { name: "Turkey wrap", calories: 680, hour: 12, minute: 40 }, { name: "Bean chili", calories: 730, hour: 18, minute: 45 }], drinks: [850, 1150] },
  { sleepHours: 8.33, bedtimeHour: 21, bedtimeMinute: 55, wakeHour: 6, wakeMinute: 15, steps: 11204, rhr: 63, hrv: 63, sleepEfficiency: 91, activeMinutes: 46, eveningWalkMinutes: 32, workoutMinutes: 42, workoutName: "Long walk", energy: 8, stress: 3, fatigue: 2, soreness: 3, lastMealHour: 19.5, meals: [{ name: "Bagel and eggs", calories: 520, hour: 8, minute: 5 }, { name: "Pasta", calories: 760, hour: 13, minute: 10 }, { name: "Steak and vegetables", calories: 840, hour: 19, minute: 30 }], drinks: [1100, 1500] },
  { sleepHours: 7.58, bedtimeHour: 22, bedtimeMinute: 36, wakeHour: 6, wakeMinute: 11, steps: 7156, rhr: 67, hrv: 50, sleepEfficiency: 86, activeMinutes: 24, eveningWalkMinutes: 16, workoutMinutes: 22, workoutName: "Easy walk", energy: 6, stress: 4, fatigue: 3, soreness: 2, lastMealHour: 19, meals: [{ name: "Oatmeal", calories: 440, hour: 8, minute: 0 }, { name: "Soup and bread", calories: 660, hour: 12, minute: 30 }, { name: "Pasta and vegetables", calories: 710, hour: 19, minute: 0 }], drinks: [750, 1050] },
];

const USUAL_BEDTIME_MINUTES = 22 * 60 + 30;
const DINNER_DEADLINE_HOUR = 19.5;
const WALK_MINUTES = 20;

function weekMonday(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  const weekday = utc.getUTCDay();
  utc.setUTCDate(utc.getUTCDate() + (weekday === 0 ? -6 : 1 - weekday));
  return utc.toISOString().slice(0, 10);
}

function behaviorHistory(days: string[]): AdherenceEvent[] {
  return DEMO_WEEK.flatMap((day, index) => {
    const date = days[index];
    if (!date) return [];
    const bedtime = day.bedtimeHour * 60 + day.bedtimeMinute;
    const onTime = bedtime <= USUAL_BEDTIME_MINUTES;
    const walked = day.eveningWalkMinutes >= WALK_MINUTES;
    const dinnerOnTime = day.lastMealHour <= DINNER_DEADLINE_HOUR;
    return [
      {
        id: `demo-bedtime-${index + 1}`,
        date,
        behaviorId: "normal-bedtime",
        kind: onTime ? "completed" : "missed",
        ...(onTime ? {} : { reason: "Later than 10:30 pm" }),
      },
      {
        id: `demo-walk-${index + 1}`,
        date,
        behaviorId: "evening-walk",
        kind: walked ? "completed" : "missed",
        ...(walked ? {} : { reason: day.eveningWalkMinutes === 0 ? "No evening walk" : "Walk was under 20 minutes" }),
      },
      {
        id: `demo-dinner-${index + 1}`,
        date,
        behaviorId: "earlier-dinner",
        kind: dinnerOnTime ? "completed" : "missed",
        ...(dinnerOnTime ? {} : { reason: "Dinner finished after 7:30 pm" }),
      },
    ];
  });
}

export function createDemoData(now = new Date()): DemoData {
  const today = utcDay(0, now);
  const days = DEMO_WEEK.map((_, index) => utcDay(index - (DEMO_WEEK.length - 1), now));
  const profile: Profile = {
    displayName: "Demo User",
    age: 29,
    sex: "male",
    heightCm: 178,
    weightKg: 78,
    goals: ["Steadier sleep", "A short daily walk"],
    dietaryPreferences: [],
    restrictions: [],
    allergies: [],
    medications: "",
    typicalBedtime: "22:30",
    typicalWake: "06:30",
    typicalDinner: "19:00",
    workPattern: "Weekday desk schedule",
    stressContext: "Sample context only",
    coachingTone: "gentle",
    notifications: false,
    timezone: "UTC",
  };
  const scoringGoals: ScoringGoals = {
    mealTarget: 3,
    calorieGoal: 1800,
    sleepHoursGoal: 8,
    activityKind: "active_minutes",
    activityGoal: 30,
    sources: { hydration: "manual", sleep: "manual", activity: "manual" },
  };
  const observations: DailyObservation[] = DEMO_WEEK.map((day, index) => ({
    date: days[index] ?? today,
    sleepHours: day.sleepHours,
    sleepEfficiency: day.sleepEfficiency,
    bedtimeMinutes: day.bedtimeHour * 60 + day.bedtimeMinute,
    rhr: day.rhr,
    hrv: day.hrv,
    steps: day.steps,
    activeMinutes: day.activeMinutes,
    energy: day.energy,
    stress: day.stress,
    lastMealHour: day.lastMealHour,
    proteinBreakfast: day.energy > 5,
    eveningWalkMinutes: day.eveningWalkMinutes,
    sources: ["manual"],
    travel: false,
    illness: false,
    unusualSchedule: false,
  }));
  const meals = DEMO_WEEK.flatMap((day, index) => day.meals.map((meal, mealIndex) => {
    const loggedOn = days[index] ?? today;
    const stamp = at(loggedOn, meal.hour, meal.minute);
    return { id: `demo-meal-${index + 1}-${mealIndex + 1}`, logged_on: loggedOn, name: meal.name, notes: "Sample meal", calories: meal.calories, protein_g: null, carbs_g: null, fat_g: null, source: "manual", source_record_id: null, created_at: stamp, updated_at: stamp };
  }));
  const hydration = DEMO_WEEK.flatMap((day, index) => day.drinks.map((milliliters, drinkIndex) => {
    const loggedOn = days[index] ?? today;
    return { id: `demo-water-${index + 1}-${drinkIndex + 1}`, logged_on: loggedOn, milliliters, source: "manual", source_record_id: null, created_at: at(loggedOn, drinkIndex === 0 ? 9 : 15, 0) };
  }));
  const sleep = DEMO_WEEK.map((day, index) => {
    const endDay = days[index] ?? today;
    const startDay = utcDay(index - DEMO_WEEK.length, now);
    const start = at(startDay, day.bedtimeHour, day.bedtimeMinute);
    const end = at(endDay, day.wakeHour, day.wakeMinute);
    return { id: `demo-sleep-${index + 1}`, start_time: start, end_time: end, duration_hours: day.sleepHours, notes: "Sample night", source: "manual", source_record_id: null, created_at: end };
  });
  const workouts = DEMO_WEEK.flatMap((day, index) => {
    if (day.workoutMinutes == null || day.workoutName == null) return [];
    const loggedOn = days[index] ?? today;
    const started = at(loggedOn, 17, 0);
    return [{ id: `demo-workout-${index + 1}`, name: day.workoutName, started_at: started, minutes: day.workoutMinutes, notes: "Sample activity", source: "manual", source_record_id: null, created_at: started }];
  });
  const recovery = DEMO_WEEK.map((day, index) => {
    const loggedOn = days[index] ?? today;
    const stamp = at(loggedOn, 20, 0);
    return { id: `demo-recovery-${index + 1}`, logged_on: loggedOn, energy: day.energy, fatigue: day.fatigue, stress: day.stress, soreness: day.soreness, notes: "Sample check-in", updated_at: stamp, created_at: stamp };
  });
  const current = DEMO_WEEK[DEMO_WEEK.length - 1];
  return {
    workspace: {
      profile,
      startingBaselines: {
        sleep: "About 7.5 hours, with an occasional shorter night",
        activity: "Walks most days, with a few longer sessions",
        nutrition: "Three meals, logged as samples",
        recovery: "Energy usually around 6 or 7",
      },
      scoringGoals,
      consents: { wearables: false, labs: false, coaching: true, productAnalytics: false },
      onboardingComplete: true,
      onboardingStep: 14,
      context: { travel: false, illness: false, unusualSchedule: false, menstrualNoted: false },
      todayEnergy: current?.energy ?? 6,
      todayStress: current?.stress ?? 4,
      todayCommitment: null,
      adherence: behaviorHistory(days),
      snoozedBehaviorIds: [],
      declinedBehaviorIds: [],
      coachMessages: [],
      reflection: {
        weekOf: weekMonday(today),
        energy: 7,
        stress: 4,
        note: "Moderately positive. Sleep timing and walks were steadier on most days. The shorter night left some fatigue. Next week, keep the 10:30 bedtime.",
        savedAt: at(today, 20, 30),
      } satisfies WeeklyReflection,
      devices: [],
      observations,
      dataAsOf: today,
      nowIso: at(today, 20, 15),
    },
    meals,
    hydration,
    hydrationTarget: 2000,
    sleep,
    workouts,
    recovery,
    cycle: {
      consent: null,
      entries: [],
    },
    scoreHistory: [],
  };
}

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

export function assessDemoData(data: DemoData): WellnessAssessment | { ok: false; error: string } {
  const today = data.workspace.dataAsOf || utcDay();
  const goals = data.workspace.scoringGoals;
  const meals = data.meals.filter((row) => row.logged_on === today);
  const drinks = data.hydration.filter((row) => row.logged_on === today);
  const nutrition = scoreNutrition({
    mealTarget: goals.mealTarget,
    meals: meals.map((row) => ({
      id: String(row.id),
      source: String(row.source ?? "manual"),
      sourceRecordId: row.source_record_id == null ? null : String(row.source_record_id),
      calories: row.calories == null ? null : Number(row.calories),
    })),
    calorieGoal: goals.calorieGoal,
    hydrationMilliliters: drinks.length === 0 ? null : drinks.reduce((sum, row) => sum + Number(row.milliliters ?? 0), 0),
    hydrationGoal: data.hydrationTarget,
    hydrationConflict: false,
  });
  const tonight = data.sleep.find((row) => String(row.end_time).slice(0, 10) === today);
  const bedtime = 22 * 60 + 30;
  const deviations = data.sleep
    .filter((row) => String(row.end_time).slice(0, 10) < today)
    .slice(0, 7)
    .map((row) => {
      const start = new Date(String(row.start_time));
      const minutes = start.getUTCHours() * 60 + start.getUTCMinutes();
      return circularMinuteDifference(minutes, bedtime);
    });
  const sleep = scoreSleep({
    goalHours: goals.sleepHoursGoal,
    hours: tonight ? Number(tonight.duration_hours) : null,
    deviationMinutes: deviations,
  });
  const recorded = data.workouts
    .filter((row) => String(row.started_at).slice(0, 10) === today)
    .reduce((sum, row) => sum + Number(row.minutes ?? 0), 0);
  const history = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(today, -(index + 1));
    const minutes = data.workouts
      .filter((row) => String(row.started_at).slice(0, 10) === day)
      .reduce((sum, row) => sum + Number(row.minutes ?? 0), 0);
    return minutes > 0 ? minutes : null;
  });
  const activity = scoreActivity({
    goal: goals.activityGoal,
    recorded: recorded > 0 ? recorded : null,
    history,
    conflict: false,
  });
  const recovery = scoreRecovery(data.recovery.filter((row) => row.logged_on === today).map((row) => ({
    id: String(row.id),
    at: String(row.updated_at ?? row.created_at),
    energy: row.energy == null ? null : Number(row.energy),
    fatigue: row.fatigue == null ? null : Number(row.fatigue),
    soreness: row.soreness == null ? null : Number(row.soreness),
  })));
  return aggregateWellness({
    userId: "demo-user",
    scoreDate: today,
    calculatedAt: data.workspace.nowIso,
    history: data.scoreHistory,
    pillars: [
      { id: "nutrition", score: nutrition.score, records: meals.length + drinks.length, inputRefs: meals.map((row) => String(row.id)), sources: ["manual"], explanation: nutrition.explanation },
      { id: "sleep", score: sleep.score, records: tonight ? 1 : 0, inputRefs: tonight ? [String(tonight.id)] : [], sources: ["manual"], explanation: sleep.explanation },
      { id: "activity", score: activity.score, records: recorded > 0 ? 1 : 0, inputRefs: [], sources: ["manual"], explanation: activity.explanation },
      { id: "recovery", score: recovery.score, records: data.recovery.filter((row) => row.logged_on === today).length, inputRefs: [], sources: ["manual"], explanation: recovery.explanation },
    ],
  });
}
