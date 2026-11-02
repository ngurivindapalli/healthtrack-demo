import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDatabase, migrate } from "@/db";
import { localDate, sanitizeScoringGoals } from "@/lib/services/workspace";
import {
  addCycleEntry,
  createLog,
  cycleContextForAuthorizedUse,
  deleteLog,
  saveCycleConsent,
  setHydrationTarget,
  updateLog,
} from "@/lib/services/manual-logs";
import {
  activityConsistencyScore,
  calorieAdherence,
  circularMinuteDifference,
  dedupeBySourceId,
  goalProgress,
  latestCompleteCheckIn,
  mealAdherence,
  preferSource,
  scaleCheckIn,
  scoreActivity,
  scoreNutrition,
  scoreRecovery,
  scoreSleep,
  sleepConsistencyScore,
  sleepDurationScore,
} from "@/lib/services/pillar-components";
import {
  INSUFFICIENT_SCORE_MESSAGE,
  MINIMUM_ELIGIBLE_PILLARS,
  PERSONAL_BASELINE_MESSAGE,
  PERSONAL_BASELINE_MIN_SCORES,
  PILLAR_IDS,
  PILLAR_WEIGHTS,
  POPULATION_COMPARISON_MESSAGE,
  aggregateWellness,
  listOfficialScores,
  refreshOfficialScore,
  saveOfficialScore,
  type PillarScoreInput,
  type WellnessPillar,
} from "@/lib/services/wellness-score";

async function database() {
  const opened = createDatabase(":memory:");
  await migrate(opened.client);
  const now = Date.now();
  for (const [id, email] of [
    ["user-a", "a@example.com"],
    ["user-b", "b@example.com"],
  ] as const) {
    await opened.client.execute({
      sql: "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
      args: [id, id, email, now, now],
    });
  }
  return opened.client;
}

describe("V2 manual trackers and wellness boundary", () => {
  it("keeps logs without configured goals from producing an official score", async () => {
    const client = await database();
    await createLog(client, "user-a", "meal", { loggedOn: "2026-11-01", name: "Lunch", calories: 500 });
    const first = await refreshOfficialScore(client, "user-a");
    await createLog(client, "user-a", "sleep", { startTime: "2026-11-01T23:00:00Z", endTime: "2026-11-02T06:00:00Z" });
    const second = await refreshOfficialScore(client, "user-a");
    assert.equal(first.ok && first.exactScore, null);
    assert.equal(second.ok && second.exactScore, null);
    assert.equal(first.ok && first.labsAffectScore, false);
    assert.equal(second.ok && second.cycleAffectsScore, false);
    assert.equal(first.ok && first.message, second.ok && second.message);
  });

  it("stores manual logs for one account and refuses the other account's delete", async () => {
    const client = await database();
    const meal = await createLog(client, "user-a", "meal", { loggedOn: "2026-11-01", name: "Lunch", calories: 500 });
    if (!("id" in meal) || !meal.id) throw new Error("error" in meal ? meal.error : "missing id");
    const sleep = await createLog(client, "user-a", "sleep", {
      startTime: "2026-11-01T23:00:00Z",
      endTime: "2026-11-02T06:30:00Z",
    });
    if (!("durationHours" in sleep)) throw new Error("error" in sleep ? sleep.error : "missing duration");
    assert.equal(sleep.durationHours, 7.5);
    assert.equal(await deleteLog(client, "user-b", "meal", meal.id), false);
    assert.equal(await deleteLog(client, "user-a", "meal", meal.id), true);
  });

  it("hides cycle context until consent is on, then removes it on withdrawal", async () => {
    const client = await database();
    assert.equal(await cycleContextForAuthorizedUse(client, "user-a"), null);
    const denied = await addCycleEntry(client, "user-a", { loggedOn: "2026-11-01", kind: "period" });
    assert.ok("error" in denied);
    await saveCycleConsent(client, "user-a", { enabled: true, typicalLengthDays: 28, variability: "unsure" });
    const created = await addCycleEntry(client, "user-a", { loggedOn: "2026-11-01", kind: "period", notes: "started" });
    if (!("id" in created)) throw new Error(created.error);
    const visible = await cycleContextForAuthorizedUse(client, "user-a");
    assert.ok(visible);
    await saveCycleConsent(client, "user-a", { enabled: false });
    assert.equal(await cycleContextForAuthorizedUse(client, "user-a"), null);
  });
});

function pillars(scores: Partial<Record<WellnessPillar, number | null>>, source = "manual"): PillarScoreInput[] {
  return PILLAR_IDS.map((id) => ({
    id,
    score: scores[id] === undefined ? null : scores[id],
    records: 1,
    inputRefs: [`${source}:${id}`],
    sources: [source],
  }));
}

function scored(scores: Partial<Record<WellnessPillar, number | null>>, history: { exactScore: number; scoreDate: string }[] = [], source = "manual") {
  return aggregateWellness({
    pillars: pillars(scores, source),
    userId: "user-a",
    scoreDate: "2026-11-01",
    calculatedAt: "2026-11-01T18:00:00.000Z",
    history,
  });
}

describe("wellness aggregation", () => {
  it("uses the approved weights and the documented three-pillar minimum", () => {
    assert.deepEqual(PILLAR_WEIGHTS, { nutrition: 25, sleep: 30, activity: 25, recovery: 20 });
    assert.equal(MINIMUM_ELIGIBLE_PILLARS, 3);
    assert.equal(PERSONAL_BASELINE_MIN_SCORES, 28);
  });

  it("calculates four eligible pillars and rounds only the displayed score", () => {
    const result = scored({ nutrition: 80, sleep: 90, activity: 70, recovery: 60 });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.exactScore, 76.5);
    assert.equal(result.displayScore, 77);
    assert.equal(result.weightSum, 100);
  });

  it("renormalizes three eligible pillars and does not treat a missing pillar as zero", () => {
    const missing = scored({ nutrition: 80, sleep: 90, activity: 70, recovery: null });
    const asZero = scored({ nutrition: 80, sleep: 90, activity: 70, recovery: 0 });
    assert.equal(missing.ok && missing.exactScore, 80.625);
    assert.equal(missing.ok && missing.displayScore, 81);
    assert.equal(missing.ok && missing.weightSum, 80);
    assert.notEqual(missing.ok && missing.exactScore, asZero.ok && asZero.exactScore);
  });

  it("withholds a score when fewer than three pillars are eligible", () => {
    const result = scored({ nutrition: 80, sleep: 90, activity: null, recovery: null });
    assert.equal(result.ok && result.exactScore, null);
    assert.equal(result.ok && result.displayScore, null);
    assert.equal(result.ok && result.message, INSUFFICIENT_SCORE_MESSAGE);
  });

  it("returns the same result for the same canonical inputs", () => {
    const manual = scored({ nutrition: 80, sleep: 90, activity: 70, recovery: 60 }, [], "manual");
    const wearable = scored({ nutrition: 80, sleep: 90, activity: 70, recovery: 60 }, [], "companion");
    assert.equal(JSON.stringify(manual), JSON.stringify(scored({ nutrition: 80, sleep: 90, activity: 70, recovery: 60 })));
    assert.equal(manual.ok && manual.exactScore, wearable.ok && wearable.exactScore);
    assert.equal(manual.ok && manual.displayScore, wearable.ok && wearable.displayScore);
  });

  it("rejects out-of-range pillar scores", () => {
    const high = scored({ nutrition: 101, sleep: 90, activity: 70, recovery: 60 });
    const low = scored({ nutrition: -1, sleep: 90, activity: 70, recovery: 60 });
    assert.equal(high.ok, false);
    assert.equal(low.ok, false);
  });

  it("keeps the personal baseline building until enough saved scores exist", () => {
    const short = scored(
      { nutrition: 80, sleep: 90, activity: 70, recovery: 60 },
      Array.from({ length: PERSONAL_BASELINE_MIN_SCORES - 1 }, (_, index) => ({ exactScore: 70, scoreDate: `2026-01-${String(index + 1).padStart(2, "0")}` })),
    );
    assert.equal(short.ok && short.personalComparison.message, PERSONAL_BASELINE_MESSAGE);
    assert.equal(short.ok && short.displayScore, 77);
    const ready = scored(
      { nutrition: 80, sleep: 90, activity: 70, recovery: 60 },
      Array.from({ length: PERSONAL_BASELINE_MIN_SCORES }, () => ({ exactScore: 70, scoreDate: "2026-01-01" })),
    );
    assert.equal(ready.ok && ready.personalComparison.delta, 6.5);
    assert.equal(ready.ok && ready.displayScore, 77);
    assert.equal(ready.ok && ready.populationComparison.message, POPULATION_COMPARISON_MESSAGE);
  });

  it("stores a score for one account only and leaves it unchanged by cycle consent", async () => {
    const client = await database();
    const calculatedAt = new Date().toISOString();
    const assessment = aggregateWellness({
      pillars: pillars({ nutrition: 80, sleep: 90, activity: 70, recovery: 60 }),
      userId: "user-a",
      scoreDate: localDate(calculatedAt, "UTC"),
      calculatedAt,
      history: [],
    });
    if (!assessment.ok) throw new Error("expected a score");
    await saveOfficialScore(client, assessment);
    assert.equal((await listOfficialScores(client, "user-b")).length, 0);
    assert.equal((await listOfficialScores(client, "user-a")).length, 1);
    await saveCycleConsent(client, "user-a", { enabled: true, typicalLengthDays: 28 });
    assert.equal((await listOfficialScores(client, "user-a"))[0]?.exactScore, 76.5);
    const refreshed = await refreshOfficialScore(client, "user-a");
    assert.equal(refreshed.ok && refreshed.exactScore, null);
    assert.equal((await listOfficialScores(client, "user-a")).length, 0);
  });

  it("edits and deletes only the owning account's logs", async () => {
    const client = await database();
    const meal = await createLog(client, "user-a", "meal", { loggedOn: "2026-11-01", name: "Soup", calories: 200 });
    const water = await createLog(client, "user-a", "hydration", { loggedOn: "2026-11-01", milliliters: 300 });
    if (!("id" in meal) || !meal.id || !("id" in water) || !water.id) throw new Error("missing id");
    const denied = await updateLog(client, "user-b", "meal", meal.id, { loggedOn: "2026-11-01", name: "Stolen" });
    assert.equal("error" in denied, true);
    const edited = await updateLog(client, "user-a", "meal", meal.id, { loggedOn: "2026-11-01", name: "Stew", calories: 450 });
    const hydration = await updateLog(client, "user-a", "hydration", water.id, { loggedOn: "2026-11-01", milliliters: 500 });
    const invalid = await updateLog(client, "user-a", "hydration", water.id, { loggedOn: "2026-11-01", milliliters: 9000 });
    assert.equal("id" in edited, true);
    assert.equal("id" in hydration, true);
    assert.equal("error" in invalid, true);
    assert.equal(await deleteLog(client, "user-b", "hydration", water.id), false);
    assert.equal(await deleteLog(client, "user-a", "hydration", water.id), true);
  });

  it("scores every approved component formula and rejects invalid goals", () => {
    assert.equal(mealAdherence(2, 4), 50);
    assert.equal(mealAdherence(0, 1), 0);
    assert.equal(mealAdherence(3, 2), 100);
    assert.equal(mealAdherence(1, 7), null);
    assert.equal(calorieAdherence(1500, 2000), 75);
    assert.equal(calorieAdherence(2500, 2000), 75);
    assert.equal(calorieAdherence(4000, 2000), 0);
    assert.equal(goalProgress(1000, 2000), 50);
    assert.equal(goalProgress(3000, 2000), 100);
    assert.equal(goalProgress(null, 2000), null);
    assert.equal(sleepDurationScore(4, 8), 50);
    assert.equal(sleepDurationScore(9, 8), 100);
    assert.equal(circularMinuteDifference(0, 23 * 60), 60);
    assert.equal(sleepConsistencyScore([0, 0, 0]), null);
    assert.equal(sleepConsistencyScore([0, 60, 60, 120]), 50);
    assert.equal(sleepConsistencyScore([180, 180, 180, 180]), 0);
    assert.equal(activityConsistencyScore([10, null, 10, null, 10], 10), null);
    assert.equal(activityConsistencyScore([5, 10, 10, 10], 10), 75);
    assert.equal(scaleCheckIn(8, false), 80);
    assert.equal(scaleCheckIn(3, true), 70);
    assert.equal(scaleCheckIn(11, false), null);
    assert.deepEqual(sanitizeScoringGoals({ mealTarget: 0, calorieGoal: -1, sleepHoursGoal: 0, activityKind: "distance", activityGoal: 0, sources: { hydration: "watch" } }), {
      mealTarget: null,
      calorieGoal: null,
      sleepHoursGoal: null,
      activityKind: null,
      activityGoal: null,
      sources: { hydration: null, sleep: null, activity: null },
    });

    const incomplete = scoreNutrition({
      mealTarget: 2,
      meals: [{ id: "m1", source: "manual", sourceRecordId: null, calories: 400 }],
      calorieGoal: 2000,
      hydrationMilliliters: null,
      hydrationGoal: 2000,
      hydrationConflict: false,
    });
    assert.equal(incomplete.components.find((item) => item.id === "mealConsistency")?.score, 50);
    assert.equal(incomplete.components.find((item) => item.id === "nutritionGoal")?.score, null);
    assert.equal(incomplete.components.find((item) => item.id === "hydration")?.score, null);
    assert.match(incomplete.explanation, /tracking, not meal quality/);
    assert.equal(incomplete.score, null);

    const complete = scoreNutrition({
      mealTarget: 1,
      meals: [
        { id: "b", source: "manual", sourceRecordId: "meal-1", calories: 500 },
        { id: "a", source: "manual", sourceRecordId: "meal-1", calories: 900 },
      ],
      calorieGoal: 500,
      hydrationMilliliters: 1000,
      hydrationGoal: 2000,
      hydrationConflict: false,
    });
    assert.equal(complete.components.find((item) => item.id === "mealConsistency")?.score, 100);
    const calorieScore = complete.components.find((item) => item.id === "nutritionGoal")?.score ?? Number.NaN;
    assert.ok(Math.abs(calorieScore - 20) < 1e-9);
    assert.equal(complete.components.find((item) => item.id === "hydration")?.score, 50);
    assert.equal(scoreNutrition({
      mealTarget: 1,
      meals: [],
      calorieGoal: 500,
      hydrationMilliliters: 100,
      hydrationGoal: null,
      hydrationConflict: true,
    }).components.find((item) => item.id === "hydration")?.score, null);

    const sleep = scoreSleep({ goalHours: 8, hours: 4, deviationMinutes: [0, 60, 60, 120] });
    assert.equal(sleep.components.find((item) => item.id === "duration")?.score, 50);
    assert.equal(sleep.components.find((item) => item.id === "consistency")?.score, 50);
    assert.equal(sleep.score, 50);
    assert.equal(scoreSleep({ goalHours: null, hours: 8, deviationMinutes: [0, 0, 0, 0] }).score, null);
    assert.match(scoreSleep({ goalHours: 8, hours: null, deviationMinutes: [] }).explanation, /not one valid sleep record/);
    assert.match(scoreActivity({ goal: 8000, recorded: null, history: [], conflict: false }).explanation, /no valid activity was recorded/);

    const activity = scoreActivity({ goal: 30, recorded: 45, history: [30, null, 15, 30, 30], conflict: false });
    assert.equal(activity.components.find((item) => item.id === "goal")?.score, 100);
    assert.equal(activity.components.find((item) => item.id === "consistency")?.score, 75);
    assert.equal(scoreActivity({ goal: 30, recorded: 30, history: [30, 30], conflict: true }).components.find((item) => item.id === "goal")?.score, null);
    assert.match(scoreActivity({ goal: 30, recorded: null, history: [], conflict: true }).explanation, /not added together/);

    const chosen = latestCompleteCheckIn([
      { id: "b", at: "2026-11-01T12:00:00.000Z", energy: 4, fatigue: 4, soreness: 4 },
      { id: "a", at: "2026-11-01T12:00:00.000Z", energy: 8, fatigue: 2, soreness: 1 },
      { id: "c", at: "2026-11-01T18:00:00.000Z", energy: 1, fatigue: 1, soreness: null },
    ]);
    assert.equal(chosen?.id, "a");
    const recovery = scoreRecovery([
      { id: "b", at: "2026-11-01T12:00:00.000Z", energy: 4, fatigue: 4, soreness: 4 },
      { id: "a", at: "2026-11-01T12:00:00.000Z", energy: 8, fatigue: 2, soreness: 1 },
    ]);
    assert.equal(recovery.components.find((item) => item.id === "energy")?.score, 80);
    assert.equal(recovery.components.find((item) => item.id === "fatigue")?.score, 80);
    assert.equal(recovery.components.find((item) => item.id === "soreness")?.score, 90);
    assert.equal(recovery.score, 83);
    assert.equal(scoreRecovery([{ id: "x", at: "2026-11-01T12:00:00.000Z", energy: 8, fatigue: 2, soreness: null }]).score, null);
    assert.equal(preferSource({ state: "value", value: 8, source: "manual" }, { state: "value", value: 4, source: "companion" }, null).state, "invalid");
    assert.equal(preferSource({ state: "value", value: 8, source: "manual" }, { state: "value", value: 4, source: "companion" }, "manual").state, "value");
    assert.deepEqual(dedupeBySourceId([
      { id: "b", source: "manual", sourceRecordId: "same" },
      { id: "a", source: "manual", sourceRecordId: "same" },
    ]).map((row) => row.id), ["a"]);
    assert.equal(JSON.stringify(complete), JSON.stringify(scoreNutrition({
      mealTarget: 1,
      meals: [
        { id: "b", source: "manual", sourceRecordId: "meal-1", calories: 500 },
        { id: "a", source: "manual", sourceRecordId: "meal-1", calories: 900 },
      ],
      calorieGoal: 500,
      hydrationMilliliters: 1000,
      hydrationGoal: 2000,
      hydrationConflict: false,
    })));
  });

  it("calculates a stored official score and keeps cycle, labs, and other accounts out of it", async () => {
    const client = await database();
    const today = localDate(new Date().toISOString(), "UTC");
    const shift = (delta: number) => {
      const [year, month, date] = today.split("-").map(Number);
      const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
      utc.setUTCDate(utc.getUTCDate() + delta);
      return utc.toISOString().slice(0, 10);
    };
    await client.execute({
      sql: "INSERT INTO member_profile (user_id, timezone, typical_bedtime, workspace_json) VALUES (?, 'UTC', '22:30', ?)",
      args: [ "user-a", JSON.stringify({ scoringGoals: { mealTarget: 1, calorieGoal: 500, sleepHoursGoal: 8, activityKind: "active_minutes", activityGoal: 30, sources: { hydration: null, sleep: null, activity: null } } }) ],
    });
    await createLog(client, "user-a", "meal", { loggedOn: today, name: "Lunch", calories: 500 });
    await createLog(client, "user-a", "hydration", { loggedOn: today, milliliters: 1000 });
    await setHydrationTarget(client, "user-a", 1000);
    await createLog(client, "user-a", "recovery", { loggedOn: today, energy: 8, fatigue: 2, soreness: 0, stress: 9 });
    for (const delta of [0, -1, -2, -3, -4]) {
      const day = shift(delta);
      await createLog(client, "user-a", "sleep", { startTime: `${day}T22:30:00.000Z`, endTime: `${shift(delta + 1)}T06:30:00.000Z` });
      await createLog(client, "user-a", "workout", { startedAt: `${day}T15:00:00.000Z`, name: "Walk", minutes: 30 });
    }
    const scoredDay = await refreshOfficialScore(client, "user-a");
    assert.equal(scoredDay.ok && scoredDay.exactScore, 97.2);
    assert.equal(scoredDay.ok && scoredDay.displayScore, 97);
    assert.equal(scoredDay.ok && scoredDay.labsAffectScore, false);
    assert.equal(scoredDay.ok && scoredDay.cycleAffectsScore, false);
    assert.equal(scoredDay.ok && scoredDay.populationComparison.message, POPULATION_COMPARISON_MESSAGE);
    await saveCycleConsent(client, "user-a", { enabled: true, typicalLengthDays: 28 });
    const afterCycle = await refreshOfficialScore(client, "user-a");
    assert.equal(afterCycle.ok && afterCycle.exactScore, 97.2);
    assert.equal((await listOfficialScores(client, "user-b")).length, 0);
    const again = await refreshOfficialScore(client, "user-a");
    assert.equal(again.ok && again.exactScore, afterCycle.ok && afterCycle.exactScore);
    assert.equal(again.ok && again.displayScore, afterCycle.ok && afterCycle.displayScore);
  });

  it("reconciles duplicates and source preference without adding overlapping records", async () => {
    const client = await database();
    const today = localDate(new Date().toISOString(), "UTC");
    await client.execute({
      sql: "INSERT INTO member_profile (user_id, timezone, typical_bedtime, workspace_json) VALUES (?, 'UTC', '22:30', ?)",
      args: ["user-a", JSON.stringify({ scoringGoals: { mealTarget: 1, calorieGoal: 800, sleepHoursGoal: 8, activityKind: "steps", activityGoal: 1000, sources: { hydration: null, sleep: "manual", activity: null } } })],
    });
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO meal_log (id, user_id, logged_on, name, calories, source, source_record_id, created_at, updated_at)
            VALUES ('m1', 'user-a', ?, 'Lunch', 400, 'manual', 'meal-1', ?, ?),
                   ('m2', 'user-a', ?, 'Lunch copy', 900, 'manual', 'meal-1', ?, ?)`,
      args: [today, now, now, today, now, now],
    });
    for (const [id, device] of [["dev-a", "device-a"], ["dev-b", "device-b"]] as const) {
      await client.execute({
        sql: `INSERT INTO linked_device (id, user_id, name, platform, installation_id, token_hash, categories_json, status, created_at)
              VALUES (?, 'user-a', 'Phone', 'ios', ?, ?, '[]', 'active', ?)`,
        args: [device, id, `hash-${id}`, now],
      });
      await client.execute({
        sql: `INSERT INTO measurement (id, user_id, device_id, source_record_id, metric, value, unit, start_time, end_time, timezone, ingested_at)
              VALUES (?, 'user-a', ?, 'steps-1', 'steps', 400, 'count', ?, ?, 'UTC', ?)`,
        args: [`measure-${id}`, device, `${today}T12:00:00.000Z`, `${today}T13:00:00.000Z`, now],
      });
    }
    await client.execute({
      sql: `INSERT INTO measurement (id, user_id, device_id, source_record_id, metric, value, unit, start_time, end_time, timezone, ingested_at)
            VALUES ('sleep-watch', 'user-a', 'device-a', 'sleep-1', 'sleep_hours', 4, 'h', ?, ?, 'UTC', ?)`,
      args: [`${today}T22:30:00.000Z`, `${today}T23:30:00.000Z`, now],
    });
    await createLog(client, "user-a", "sleep", { startTime: `${today}T22:30:00.000Z`, endTime: `${today}T23:30:00.000Z` });
    const preferred = await refreshOfficialScore(client, "user-a");
    const sleep = preferred.ok ? preferred.pillars.find((pillar) => pillar.id === "sleep") : null;
    const activity = preferred.ok ? preferred.pillars.find((pillar) => pillar.id === "activity") : null;
    const nutrition = preferred.ok ? preferred.pillars.find((pillar) => pillar.id === "nutrition") : null;
    assert.match(sleep?.explanation ?? "", /Sleep duration is 12\.5/);
    assert.match(activity?.explanation ?? "", /Activity goal progress is 40/);
    assert.match(nutrition?.explanation ?? "", /1 distinct meals/);
    assert.match(nutrition?.explanation ?? "", /Calorie progress is 50/);
  });

  it("does not mix an older algorithm version into the personal comparison", async () => {
    const client = await database();
    await client.execute({
      sql: `INSERT INTO wellness_score (id, user_id, score_date, exact_score, display_score, algorithm_version, provenance_json, calculated_at)
            VALUES ('old', 'user-a', '2026-10-01', 50, 50, 'wellness-aggregate@1.0', '{}', '2026-10-01T00:00:00.000Z')`,
    });
    const history = await listOfficialScores(client, "user-a");
    assert.equal(history.length, 0);
    const current = await refreshOfficialScore(client, "user-a");
    assert.equal(current.ok && current.exactScore, null);
    assert.equal(current.ok && current.algorithmVersion, "wellness-v1.0");
    const leftover = await client.execute({ sql: "SELECT algorithm_version FROM wellness_score WHERE user_id = ?", args: ["user-a"] });
    assert.deepEqual(leftover.rows.map((row) => String(row.algorithm_version)), ["wellness-aggregate@1.0"]);
  });
});
