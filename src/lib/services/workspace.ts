import type { Client, InArgs } from "@libsql/client";
import {
  type ConsentChoices,
  type ContextFlags,
  type DailyObservation,
  type LinkedDevice,
  type Profile,
  type ScoringGoals,
  type StartingBaselines,
  type TrackerSource,
} from "@/lib/types";

const DEFAULT_CONSENTS: ConsentChoices = {
  wearables: false,
  labs: false,
  coaching: true,
  productAnalytics: false,
};

export async function ensureProfile(client: Client, userId: string, name: string): Promise<void> {
  await client.execute({
    sql: `INSERT INTO member_profile (user_id, display_name) VALUES (?, ?)
          ON CONFLICT(user_id) DO NOTHING`,
    args: [userId, name.slice(0, 80)],
  });
}

export async function deleteHealthData(client: Client, userId: string): Promise<void> {
  const statements: Array<{ sql: string; args: InArgs }> = [
    { sql: "DELETE FROM measurement WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM sync_batch WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM linked_device WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM pairing_session WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM meal_log WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM hydration_log WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM hydration_target WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM sleep_log WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM workout_log WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM recovery_log WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM cycle_entry WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM cycle_consent WHERE user_id = ?", args: [userId] },
    { sql: "DELETE FROM wellness_score WHERE user_id = ?", args: [userId] },
  ];
  for (const statement of statements) {
    await client.execute(statement);
  }
  await client.execute({
    sql: `UPDATE member_profile
          SET goals_json = '[]', dietary_json = '[]', restrictions_json = '[]', allergies_json = '[]',
              medications = '', stress_context = '', workspace_json = '{}', consents_json = '{}',
              onboarding_complete = 0, onboarding_step = 0
          WHERE user_id = ?`,
    args: [userId],
  });
}

type ProfileRow = {
  display_name: string;
  age: number;
  sex: string;
  height_cm: number;
  weight_kg: number;
  goals_json: string;
  dietary_json: string;
  restrictions_json: string;
  allergies_json: string;
  medications: string;
  typical_bedtime: string;
  typical_wake: string;
  typical_dinner: string;
  work_pattern: string;
  stress_context: string;
  coaching_tone: string;
  notifications: number;
  timezone: string;
  onboarding_complete: number;
  onboarding_step: number;
  consents_json: string;
  workspace_json: string;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function rowToProfile(row: ProfileRow): Profile {
  return {
    displayName: row.display_name,
    age: row.age,
    sex: row.sex as Profile["sex"],
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goals: parseJson<string[]>(row.goals_json, []),
    dietaryPreferences: parseJson<string[]>(row.dietary_json, []),
    restrictions: parseJson<string[]>(row.restrictions_json, []),
    allergies: parseJson<string[]>(row.allergies_json, []),
    medications: row.medications,
    typicalBedtime: row.typical_bedtime,
    typicalWake: row.typical_wake,
    typicalDinner: row.typical_dinner,
    workPattern: row.work_pattern,
    stressContext: row.stress_context,
    coachingTone: row.coaching_tone === "direct" ? "direct" : "gentle",
    notifications: row.notifications === 1,
    timezone: row.timezone || "UTC",
  };
}

export async function readProfile(client: Client, userId: string): Promise<ProfileRow | null> {
  const result = await client.execute({
    sql: "SELECT * FROM member_profile WHERE user_id = ?",
    args: [userId],
  });
  return (result.rows[0] as unknown as ProfileRow | undefined) ?? null;
}

function sourceOf(value: unknown): TrackerSource | null {
  return value === "manual" || value === "companion" ? value : null;
}

function positive(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function sanitizeScoringGoals(value: unknown): ScoringGoals {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sources = source.sources && typeof source.sources === "object" ? (source.sources as Record<string, unknown>) : {};
  const meal = Number(source.mealTarget);
  const kind = source.activityKind === "steps" || source.activityKind === "active_minutes" ? source.activityKind : null;
  return {
    mealTarget: Number.isInteger(meal) && meal >= 1 && meal <= 6 ? meal : null,
    calorieGoal: positive(source.calorieGoal),
    sleepHoursGoal: positive(source.sleepHoursGoal),
    activityKind: kind,
    activityGoal: positive(source.activityGoal),
    sources: {
      hydration: sourceOf(sources.hydration),
      sleep: sourceOf(sources.sleep),
      activity: sourceOf(sources.activity),
    },
  };
}

export function sanitizeBaselines(value: unknown): StartingBaselines {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const text = (key: keyof StartingBaselines) => String(source[key] ?? "").slice(0, 200);
  return { sleep: text("sleep"), activity: text("activity"), nutrition: text("nutrition"), recovery: text("recovery") };
}

export type WorkspacePayload = {
  profile: Profile;
  startingBaselines: StartingBaselines;
  scoringGoals: ScoringGoals;
  consents: ConsentChoices;
  onboardingComplete: boolean;
  onboardingStep: number;
  context: ContextFlags;
  todayEnergy: number | null;
  todayStress: number | null;
  todayCommitment: unknown;
  adherence: unknown[];
  snoozedBehaviorIds: string[];
  declinedBehaviorIds: string[];
  coachMessages: unknown[];
  reflection: unknown;
  devices: LinkedDevice[];
  observations: DailyObservation[];
  dataAsOf: string;
  nowIso: string;
};

const SEX = new Set(["female", "male", "other", "prefer_not_to_say"]);

export function sanitizeProfile(input: Partial<Profile>, fallback: Profile): Profile {
  const age = Number(input.age);
  const height = Number(input.heightCm);
  const weight = Number(input.weightKg);
  return {
    displayName: String(input.displayName ?? fallback.displayName).slice(0, 80),
    age: Number.isFinite(age) ? Math.min(120, Math.max(13, Math.round(age))) : fallback.age,
    sex: SEX.has(String(input.sex)) ? (input.sex as Profile["sex"]) : fallback.sex,
    heightCm: Number.isFinite(height) ? Math.min(250, Math.max(80, Math.round(height))) : fallback.heightCm,
    weightKg: Number.isFinite(weight) ? Math.min(400, Math.max(20, Math.round(weight))) : fallback.weightKg,
    goals: Array.isArray(input.goals) ? input.goals.map((goal) => String(goal).slice(0, 80)).slice(0, 8) : fallback.goals,
    dietaryPreferences: Array.isArray(input.dietaryPreferences)
      ? input.dietaryPreferences.map((item) => String(item).slice(0, 80)).slice(0, 12)
      : fallback.dietaryPreferences,
    restrictions: Array.isArray(input.restrictions)
      ? input.restrictions.map((item) => String(item).slice(0, 80)).slice(0, 12)
      : fallback.restrictions,
    allergies: Array.isArray(input.allergies)
      ? input.allergies.map((item) => String(item).slice(0, 80)).slice(0, 12)
      : fallback.allergies,
    medications: String(input.medications ?? fallback.medications).slice(0, 500),
    typicalBedtime: String(input.typicalBedtime ?? fallback.typicalBedtime).slice(0, 8),
    typicalWake: String(input.typicalWake ?? fallback.typicalWake).slice(0, 8),
    typicalDinner: String(input.typicalDinner ?? fallback.typicalDinner).slice(0, 8),
    workPattern: String(input.workPattern ?? fallback.workPattern).slice(0, 200),
    stressContext: String(input.stressContext ?? fallback.stressContext).slice(0, 500),
    coachingTone: input.coachingTone === "direct" ? "direct" : "gentle",
    notifications: Boolean(input.notifications ?? fallback.notifications),
    timezone: String(input.timezone ?? fallback.timezone).slice(0, 64) || "UTC",
  };
}

export async function saveProfile(
  client: Client,
  userId: string,
  profile: Profile,
  extra: {
    consents: ConsentChoices;
    onboardingComplete: boolean;
    onboardingStep: number;
    workspaceJson: string;
  },
): Promise<void> {
  await client.execute({
    sql: `UPDATE member_profile SET
      display_name = ?, age = ?, sex = ?, height_cm = ?, weight_kg = ?,
      goals_json = ?, dietary_json = ?, restrictions_json = ?, allergies_json = ?,
      medications = ?, typical_bedtime = ?, typical_wake = ?, typical_dinner = ?,
      work_pattern = ?, stress_context = ?, coaching_tone = ?, notifications = ?,
      timezone = ?, onboarding_complete = ?, onboarding_step = ?, consents_json = ?,
      workspace_json = ?
      WHERE user_id = ?`,
    args: [
      profile.displayName,
      profile.age,
      profile.sex,
      profile.heightCm,
      profile.weightKg,
      JSON.stringify(profile.goals),
      JSON.stringify(profile.dietaryPreferences),
      JSON.stringify(profile.restrictions),
      JSON.stringify(profile.allergies),
      profile.medications,
      profile.typicalBedtime,
      profile.typicalWake,
      profile.typicalDinner,
      profile.workPattern,
      profile.stressContext,
      profile.coachingTone,
      profile.notifications ? 1 : 0,
      profile.timezone,
      extra.onboardingComplete ? 1 : 0,
      extra.onboardingStep,
      JSON.stringify(extra.consents),
      extra.workspaceJson,
      userId,
    ],
  });
}

export function localDate(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  }
}

export async function listDevices(client: Client, userId: string): Promise<LinkedDevice[]> {
  const result = await client.execute({
    sql: `SELECT id, name, platform, categories_json, status, created_at, last_sync_at
          FROM linked_device WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    platform: String(row.platform),
    status: row.status === "revoked" ? "revoked" : "active",
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
    categories: parseJson<string[]>(String(row.categories_json), []),
    createdAt: String(row.created_at),
  }));
}

export { DEFAULT_CONSENTS };
