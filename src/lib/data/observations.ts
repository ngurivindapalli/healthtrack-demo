import { addDays, clamp, gaussian, mulberry32 } from "@/lib/math";
import { DEMO_TODAY } from "@/lib/metrics";
import type { DailyObservation, DataSourceKind, Profile } from "@/lib/types";

const HISTORY_DAYS = 42;
const START = addDays(DEMO_TODAY, -(HISTORY_DAYS - 1));

/** Days in the baseline period when Ram actually walked after dinner. */
const WALK_OFFSETS = [2, 4, 7, 9, 11, 14, 16, 18, 21, 23, 25, 28, 30, 32, 35];
/** Late dinner nights that drag recovery. */
const LATE_MEAL_OFFSETS = [6, 13, 20, 27, 33, 38];
const MISSING_OFFSETS = [8, 24];

export interface ObservationOptions {
  seed: number;
  days?: number;
  endDate?: string;
  typicalSleepHours?: number;
  typicalRhr?: number;
  typicalHrv?: number;
  typicalSteps?: number;
  typicalEnergy?: number;
  typicalStress?: number;
  typicalBedtime?: number;
  typicalDinnerHour?: number;
  applyRecentShift?: boolean;
  sources?: DataSourceKind[];
}

export function generateObservations(
  options: ObservationOptions,
): DailyObservation[] {
  const days = options.days ?? HISTORY_DAYS;
  const endDate = options.endDate ?? DEMO_TODAY;
  const start = addDays(endDate, -(days - 1));
  const rng = mulberry32(options.seed);
  const sleepMu = options.typicalSleepHours ?? 7.3;
  const rhrMu = options.typicalRhr ?? 61;
  const hrvMu = options.typicalHrv ?? 47;
  const stepsMu = options.typicalSteps ?? 7800;
  const energyMu = options.typicalEnergy ?? 7.4;
  const stressMu = options.typicalStress ?? 4.1;
  const bedtimeMu = options.typicalBedtime ?? 22 * 60 + 30;
  const dinnerMu = options.typicalDinnerHour ?? 19.5;
  const sources = options.sources ?? (["oura", "apple_health"] as DataSourceKind[]);
  const applyShift = options.applyRecentShift ?? true;

  const walkSet = new Set(WALK_OFFSETS);
  const lateSet = new Set(LATE_MEAL_OFFSETS);
  const missingSet = new Set(MISSING_OFFSETS);

  const rows: DailyObservation[] = [];

  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const daysFromEnd = days - 1 - i;
    const inShift = applyShift && daysFromEnd <= 3;
    const missing = missingSet.has(i) && !inShift;

    if (missing) {
      rows.push({
        date,
        sleepHours: null,
        sleepEfficiency: null,
        bedtimeMinutes: null,
        rhr: null,
        hrv: null,
        steps: null,
        activeMinutes: null,
        energy: null,
        stress: null,
        lastMealHour: null,
        proteinBreakfast: null,
        eveningWalkMinutes: null,
        sources: [],
        travel: i === 24,
        illness: false,
        unusualSchedule: i === 24,
      });
      continue;
    }

    const walked = walkSet.has(i) && !inShift;
    const lateMeal = lateSet.has(i) || (inShift && daysFromEnd <= 2);
    const prevWalked = i > 0 && walkSet.has(i - 1) && !missingSet.has(i - 1);

    let sleepHours = gaussian(rng, sleepMu, 0.28);
    let rhr = gaussian(rng, rhrMu, 1.6);
    let hrv = gaussian(rng, hrvMu, 3.2);
    let steps = gaussian(rng, stepsMu, 900);
    let energy = gaussian(rng, energyMu, 0.45);
    let stress = gaussian(rng, stressMu, 0.5);
    let bedtime = gaussian(rng, bedtimeMu, 18);
    let dinner = gaussian(rng, dinnerMu, 0.35);
    let efficiency = gaussian(rng, 88, 2.4);

    if (walked) {
      steps += 1800;
      dinner = Math.min(dinner, 19.6);
    }
    if (prevWalked) {
      hrv += 5.5;
      rhr -= 2.4;
      sleepHours += 0.18;
      energy += 0.35;
    }
    if (lateMeal) {
      dinner = 21.1 + rng() * 0.5;
      hrv -= 4.2;
      rhr += 2.1;
      sleepHours -= 0.22;
      efficiency -= 3;
    }

    if (inShift) {
      sleepHours = gaussian(rng, sleepMu * 0.88, 0.12);
      hrv = gaussian(rng, hrvMu * 0.83, 1.1);
      rhr = gaussian(rng, rhrMu + 6, 0.7);
      steps = gaussian(rng, stepsMu * 0.78, 280);
      energy = gaussian(rng, 6.1, 0.25);
      stress = gaussian(rng, 5.7, 0.25);
      bedtime = gaussian(rng, bedtimeMu + 48, 12);
      dinner = gaussian(rng, 20.7, 0.25);
      efficiency = gaussian(rng, 82, 1.6);
    }

    rows.push({
      date,
      sleepHours: clamp(sleepHours, 4.5, 9.5),
      sleepEfficiency: clamp(efficiency, 70, 97),
      bedtimeMinutes: clamp(bedtime, 20 * 60, 26 * 60),
      rhr: clamp(rhr, 48, 85),
      hrv: clamp(hrv, 18, 90),
      steps: Math.round(clamp(steps, 1800, 18000)),
      activeMinutes: Math.round(clamp(steps / 120 + gaussian(rng, 8, 6), 5, 140)),
      energy: clamp(energy, 2, 10),
      stress: clamp(stress, 1, 10),
      lastMealHour: clamp(dinner, 17, 23.5),
      proteinBreakfast: rng() > 0.35,
      eveningWalkMinutes: walked ? Math.round(18 + rng() * 8) : inShift ? 0 : 0,
      sources,
      travel: false,
      illness: false,
      unusualSchedule: inShift && daysFromEnd === 2,
    });
  }

  return rows;
}

export const RAM_OBSERVATIONS = generateObservations({
  seed: 20261016,
  applyRecentShift: true,
});

export function observationsFromProfile(
  profile: Profile,
  connected: boolean,
): DailyObservation[] {
  if (!connected) return [];
  const bedtimeParts = profile.typicalBedtime.split(":").map(Number);
  const dinnerParts = profile.typicalDinner.split(":").map(Number);
  const bedtime =
    (bedtimeParts[0] ?? 22) * 60 + (bedtimeParts[1] ?? 30);
  const dinnerHour =
    (dinnerParts[0] ?? 19) + (dinnerParts[1] ?? 30) / 60;
  return generateObservations({
    seed: 44 + profile.age * 13,
    days: 12,
    typicalSleepHours: 7.1,
    typicalRhr: profile.sex === "female" ? 64 : 61,
    typicalHrv: profile.sex === "female" ? 42 : 47,
    typicalSteps: 7200,
    typicalEnergy: 6.8,
    typicalStress: 4.6,
    typicalBedtime: bedtime,
    typicalDinnerHour: dinnerHour,
    applyRecentShift: false,
    sources: ["oura"],
  });
}

export function historyStart(): string {
  return START;
}
