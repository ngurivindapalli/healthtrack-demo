import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessDemoData, createDemoData } from "@/lib/demo/data";
import { demoRuntime } from "@/lib/demo/config";
import { allAssociations } from "@/lib/engines/associations";
import type { AdherenceEvent, WeeklyReflection } from "@/lib/types";

describe("demo mode", () => {
  it("stays off unless the variable is exactly true", () => {
    assert.equal(demoRuntime({}), "off");
    assert.equal(demoRuntime({ NEXT_PUBLIC_DEMO_MODE: "false" }), "off");
    assert.equal(demoRuntime({ NEXT_PUBLIC_DEMO_MODE: "true" }), "on");
  });

  it("runs on a production deployment only when demo mode is explicitly enabled", () => {
    assert.equal(demoRuntime({ NEXT_PUBLIC_DEMO_MODE: "true", VERCEL_ENV: "production" }), "on");
    assert.equal(demoRuntime({ NEXT_PUBLIC_DEMO_MODE: "true", VERCEL_ENV: "preview" }), "on");
    assert.equal(demoRuntime({ VERCEL_ENV: "production" }), "off");
  });

  it("seeds seven consecutive days for one moderately active adult", () => {
    const data = createDemoData(new Date("2026-11-11T15:00:00.000Z"));
    const observations = data.workspace.observations;
    assert.deepEqual(observations.map((row) => row.date), [
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);
    assert.deepEqual(observations.map((row) => row.steps), [7842, 9215, 5638, 10487, 8326, 11204, 7156]);
    assert.deepEqual(observations.map((row) => row.rhr), [67, 65, 70, 64, 66, 63, 67]);
    assert.equal(data.workspace.profile.age, 29);
    assert.equal(data.workspace.profile.sex, "male");
    assert.equal(data.workspace.profile.heightCm, 178);
    assert.equal(data.workspace.profile.weightKg, 78);
    assert.equal(new Set(observations.map((row) => row.steps)).size, 7);
    assert.ok(observations.every((row) => row.sleepHours != null && row.rhr != null && row.steps != null));
  });

  it("scores the synthetic dataset with the existing wellness algorithm", () => {
    const assessment = assessDemoData(createDemoData(new Date("2026-11-04T20:00:00.000Z")));
    assert.equal(assessment.ok, true);
    if (!assessment.ok) return;
    assert.equal(assessment.status, "scored");
    assert.equal(assessment.algorithmVersion, "wellness-v1.0");
    assert.equal(assessment.cycleAffectsScore, false);
    assert.equal(assessment.populationComparison.state, "unavailable");
    assert.ok((assessment.displayScore ?? 0) > 0);
  });

  it("records behavior attempts that match the same seven days", () => {
    const data = createDemoData(new Date("2026-11-11T15:00:00.000Z"));
    const observations = data.workspace.observations;
    const adherence = data.workspace.adherence as AdherenceEvent[];
    const reflection = data.workspace.reflection as WeeklyReflection;
    const behaviors = ["normal-bedtime", "evening-walk", "earlier-dinner"];
    assert.equal(adherence.length, observations.length * behaviors.length);
    for (const row of observations) {
      const bedtime = adherence.find((item) => item.date === row.date && item.behaviorId === "normal-bedtime");
      const walk = adherence.find((item) => item.date === row.date && item.behaviorId === "evening-walk");
      const dinner = adherence.find((item) => item.date === row.date && item.behaviorId === "earlier-dinner");
      assert.equal(bedtime?.kind, (row.bedtimeMinutes ?? 0) <= 22 * 60 + 30 ? "completed" : "missed");
      assert.equal(walk?.kind, (row.eveningWalkMinutes ?? 0) >= 20 ? "completed" : "missed");
      assert.equal(dinner?.kind, (row.lastMealHour ?? 99) <= 19.5 ? "completed" : "missed");
    }
    const completed = (id: string) => adherence.filter((item) => item.behaviorId === id && item.kind === "completed").length;
    const missed = (id: string) => adherence.filter((item) => item.behaviorId === id && item.kind === "missed").length;
    assert.deepEqual([completed("normal-bedtime"), missed("normal-bedtime")], [4, 3]);
    assert.deepEqual([completed("evening-walk"), missed("evening-walk")], [4, 3]);
    assert.deepEqual([completed("earlier-dinner"), missed("earlier-dinner")], [6, 1]);
    assert.equal(reflection.weekOf, "2026-11-09");
    assert.equal(reflection.energy, 7);
    assert.equal(reflection.stress, 4);
    assert.match(reflection.note, /10:30 bedtime/);
    assert.equal(
      adherence.filter((item) => item.date.startsWith("2026-11") && item.kind === "completed").length,
      14,
    );
  });

  it("keeps association comparisons consistent with the stored week", () => {
    const data = createDemoData(new Date("2026-11-11T15:00:00.000Z"));
    const associations = allAssociations(data.workspace.observations);
    const sleep = associations.find((item) => item.behaviorId === "normal-bedtime");
    const walk = associations.find((item) => item.behaviorId === "evening-walk");
    const dinner = associations.find((item) => item.behaviorId === "earlier-dinner");
    assert.ok(sleep && walk && dinner);
    if (!sleep || !walk || !dinner) return;
    assert.equal(sleep.sampleSize, 5);
    assert.ok(sleep.withBehavior > sleep.withoutBehavior);
    assert.equal(sleep.direction, "uncertain");
    assert.match(sleep.summary, /54 ms vs 52 ms/);
    assert.equal(walk.sampleSize, 5);
    assert.equal(walk.direction, "uncertain");
    assert.match(walk.summary, /Not enough repeated personal observations/);
    assert.equal(dinner.sampleSize, 0);
    assert.match(dinner.summary, /still forming/);
    for (const item of associations) {
      assert.equal(Number.isFinite(item.withBehavior) && Number.isFinite(item.withoutBehavior), true);
      assert.doesNotMatch(item.summary, /\d+\.\d{2,}/);
      assert.equal(item.summary.includes("NaN"), false);
    }
    const before = assessDemoData(data);
    const shifted = createDemoData(new Date("2026-11-18T15:00:00.000Z"));
    const after = assessDemoData(shifted);
    assert.equal(before.ok && after.ok, true);
    if (!before.ok || !after.ok) return;
    assert.equal(before.exactScore, after.exactScore);
    assert.equal(before.algorithmVersion, "wellness-v1.0");
  });

  it("keeps a withdrawn cycle preference from changing the score input", () => {
    const data = createDemoData(new Date("2026-11-04T20:00:00.000Z"));
    const before = assessDemoData(data);
    data.cycle.consent = null;
    data.cycle.entries = [];
    const after = assessDemoData(data);
    assert.equal(before.ok && after.ok, true);
    if (!before.ok || !after.ok) return;
    assert.equal(before.exactScore, after.exactScore);
  });
});
