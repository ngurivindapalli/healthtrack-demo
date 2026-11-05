import { circularMinuteDifference, scoreActivity, scoreNutrition, scoreRecovery, scoreSleep } from "@/lib/services/pillar-components";
import { aggregateWellness, type WellnessAssessment } from "@/lib/services/wellness-score";
import type { WorkspacePayload } from "@/lib/services/workspace";
import type { DailyObservation, Profile, ScoringGoals } from "@/lib/types";

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

export function createDemoData(now = new Date()): DemoData {
  const today = utcDay(0, now);
  const profile: Profile = {
    displayName: "Demo User",
    age: 34,
    sex: "female",
    heightCm: 168,
    weightKg: 64,
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
  const observations: DailyObservation[] = Array.from({ length: 14 }, (_, index) => {
    const offset = index - 13;
    return {
      date: utcDay(offset, now),
      sleepHours: 7.4 + (index % 3) * 0.2,
      sleepEfficiency: null,
      bedtimeMinutes: 22 * 60 + 20 + (index % 4) * 5,
      rhr: null,
      hrv: null,
      steps: 6400 + index * 80,
      activeMinutes: 28 + (index % 5),
      energy: 6 + (index % 3),
      stress: 3 + (index % 2),
      lastMealHour: 19,
      proteinBreakfast: null,
      eveningWalkMinutes: 20,
      sources: ["manual"],
      travel: false,
      illness: false,
      unusualSchedule: false,
    };
  });
  const meals = [
    { id: "demo-meal-1", logged_on: today, name: "Oatmeal", notes: "Sample breakfast", calories: 420, protein_g: null, carbs_g: null, fat_g: null, source: "manual", source_record_id: null, created_at: at(today, 8, 0), updated_at: at(today, 8, 0) },
    { id: "demo-meal-2", logged_on: today, name: "Rice and vegetables", notes: "Sample lunch", calories: 680, protein_g: null, carbs_g: null, fat_g: null, source: "manual", source_record_id: null, created_at: at(today, 12, 30), updated_at: at(today, 12, 30) },
    { id: "demo-meal-3", logged_on: today, name: "Soup and bread", notes: "Sample dinner", calories: 640, protein_g: null, carbs_g: null, fat_g: null, source: "manual", source_record_id: null, created_at: at(today, 18, 45), updated_at: at(today, 18, 45) },
  ];
  const hydration = [
    { id: "demo-water-1", logged_on: today, milliliters: 700, source: "manual", source_record_id: null, created_at: at(today, 9, 0) },
    { id: "demo-water-2", logged_on: today, milliliters: 1100, source: "manual", source_record_id: null, created_at: at(today, 15, 0) },
  ];
  const sleep = [0, 1, 2, 3, 4].map((ago) => {
    const startDay = utcDay(-ago - (ago === 0 ? 1 : 1), now);
    const endDay = utcDay(-ago, now);
    const minute = [30, 20, 40, 25, 35][ago] ?? 30;
    const start = at(ago === 0 ? utcDay(-1, now) : startDay, 22, minute);
    const end = at(endDay, 6, minute);
    return {
      id: `demo-sleep-${ago}`,
      start_time: start,
      end_time: end,
      duration_hours: 8,
      notes: "Sample night",
      source: "manual",
      source_record_id: null,
      created_at: end,
    };
  });
  const workouts = [0, 1, 2, 3, 4].map((ago) => ({
    id: `demo-walk-${ago}`,
    name: "Easy walk",
    started_at: at(utcDay(-ago, now), 17, 0),
    minutes: ago === 0 ? 32 : 30,
    notes: "Sample activity",
    source: "manual",
    source_record_id: null,
    created_at: at(utcDay(-ago, now), 17, 30),
  }));
  const recovery = [{
    id: "demo-recovery-today",
    logged_on: today,
    energy: 7,
    fatigue: 3,
    stress: 4,
    soreness: 2,
    notes: "Sample check-in",
    updated_at: at(today, 20, 0),
    created_at: at(today, 20, 0),
  }];
  return {
    workspace: {
      profile,
      startingBaselines: {
        sleep: "About 7.5 hours on weekdays",
        activity: "A short walk most days",
        nutrition: "Three meals, logged as samples",
        recovery: "Energy usually around 6 or 7",
      },
      scoringGoals,
      consents: { wearables: false, labs: false, coaching: true, productAnalytics: false },
      onboardingComplete: true,
      onboardingStep: 14,
      context: { travel: false, illness: false, unusualSchedule: false, menstrualNoted: false },
      todayEnergy: 7,
      todayStress: 4,
      todayCommitment: null,
      adherence: [],
      snoozedBehaviorIds: [],
      declinedBehaviorIds: [],
      coachMessages: [],
      reflection: null,
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
      consent: { enabled: 1, typical_length_days: 28, variability: "Fairly regular", life_context: "Sample context. This is not a medical record." },
      entries: [{
        id: "demo-cycle-1",
        logged_on: utcDay(-2, now),
        kind: "note",
        flow: null,
        symptoms_json: "[]",
        notes: "Sample note stored only in this browser.",
        created_at: at(utcDay(-2, now), 9, 0),
      }],
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
