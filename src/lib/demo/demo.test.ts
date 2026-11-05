import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessDemoData, createDemoData } from "@/lib/demo/data";
import { demoRuntime } from "@/lib/demo/config";

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
