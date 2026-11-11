import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createBlankCustomState } from "@/lib/data/ram";
import { createDemoData } from "@/lib/demo/data";
import { buildAppModel } from "@/lib/engines/view-model";
import { completeInsightRequest } from "@/lib/services/coach-groq";
import {
  buildInsightBrief,
  hasInsightMeasurements,
  insightFingerprint,
  insightIssue,
  insightsPaused,
  matchInsightCache,
  parseDailyInsight,
  refreshCoolingDown,
  shareInsightRequest,
} from "@/lib/services/daily-insights";
import type { DailyObservation } from "@/lib/types";

function demo() {
  const data = createDemoData(new Date("2026-11-11T15:00:00.000Z"));
  const state = createBlankCustomState();
  state.persistedObservations = data.workspace.observations;
  state.dataAsOf = data.workspace.dataAsOf;
  state.todayEnergy = data.workspace.todayEnergy;
  state.todayStress = data.workspace.todayStress;
  return { observations: data.workspace.observations, model: buildAppModel(state), asOf: data.workspace.dataAsOf };
}

describe("daily wellness insights", () => {
  it("describes the open UTC day and leaves identity out", () => {
    const { observations, model, asOf } = demo();
    const brief = buildInsightBrief(observations, model.status, asOf);
    assert.equal(asOf, "2026-11-11");
    assert.match(brief, /2026-11-11 is still open/);
    assert.match(brief, /not final/);
    assert.match(brief, /2026-11-10 \(completed day\)/);
    assert.match(brief, /7156/);
    assert.match(brief, /11204/);
    assert.doesNotMatch(brief, /Demo User/);
    assert.doesNotMatch(brief, /@/);
    assert.equal(hasInsightMeasurements([]), false);
    assert.equal(hasInsightMeasurements(observations), true);
  });

  it("rejects invented numbers and accepts a structured reply", () => {
    const { observations, model, asOf } = demo();
    const brief = buildInsightBrief(observations, model.status, asOf);
    const good = parseDailyInsight(
      JSON.stringify({
        overall: "You're looking fairly steady, with sleep and movement both showing up most days.",
        goingWell: "Last night's sleep was about 7h 35m, and the day before was a longer walk day.",
        attention: "Nothing in particular stands out as a sharp change in the available data.",
        tryToday: "Keep the usual bedtime if you can — that has been the steadier pattern.",
      }),
      brief,
    );
    assert.ok(good);
    assert.equal(good?.overall.includes("**"), false);
    const invented = parseDailyInsight(
      JSON.stringify({
        overall: "You walked 99999 steps, which is a huge change.",
        goingWell: "Sleep looked consistent across the recorded nights.",
        attention: "The step count is far outside the recorded days.",
        tryToday: "Take an easier evening if you feel tired.",
      }),
      brief,
    );
    assert.equal(invented, null);
    const rounded = parseDailyInsight(
      JSON.stringify({
        overall: "Steps peaked above 11 k on the strongest day.",
        goingWell: "Sleep showed up on the completed nights.",
        attention: "Nothing sharp stands out in the available data.",
        tryToday: "Keep the usual bedtime tonight.",
      }),
      brief,
    );
    assert.equal(rounded?.overall.includes("11"), true);
    const unsupportedRound = parseDailyInsight(
      JSON.stringify({
        overall: "Steps peaked above 11 k on the strongest day.",
        goingWell: "Sleep showed up on the completed nights.",
        attention: "Nothing sharp stands out in the available data.",
        tryToday: "Keep the usual bedtime tonight.",
      }),
      "Sleep 7h 35m and resting heart rate 67 bpm are recorded.",
    );
    assert.equal(unsupportedRound, null);
    assert.equal(insightIssue("not json", brief), "invalid_json");
    assert.equal(
      insightIssue('{"overall":"Sleep looked steady over the recorded nights."}', brief),
      "schema_validation_failed",
    );
    const markdown = parseDailyInsight(
      '{"overall":"**Sleep** looked steady over the recorded nights.","goingWell":"Activity showed up on most of the completed days.","attention":"Nothing sharp stands out in the available data.","tryToday":"Keep tonight close to your usual bedtime."}',
      brief,
    );
    assert.equal(markdown?.overall.includes("**"), false);
    assert.match(markdown?.overall ?? "", /Sleep looked steady/);
  });

  it("reuses a matching cache and drops it when measurements change", () => {
    const { observations, asOf } = demo();
    const fingerprint = insightFingerprint(observations);
    const insight = {
      overall: "A steady week in the recorded measurements.",
      goingWell: "Sleep showed up on the completed nights.",
      attention: "Nothing sharp stands out in the available data.",
      tryToday: "Keep the usual bedtime tonight.",
    };
    const cache = { fingerprint, date: asOf, insight, at: 1_000 };
    assert.equal(matchInsightCache(cache, fingerprint, asOf)?.tryToday, insight.tryToday);
    const changed = observations.map((row, index) => (index === observations.length - 1 ? { ...row, steps: 1000 } : row));
    assert.equal(matchInsightCache(cache, insightFingerprint(changed), asOf), null);
    assert.equal(matchInsightCache(cache, fingerprint, "2026-11-12"), null);
    assert.equal(refreshCoolingDown(1_000, 20_000), true);
    assert.equal(refreshCoolingDown(1_000, 50_000), false);
  });

  it("shares one request while an identical insight is already loading", async () => {
    let calls = 0;
    const run = () => {
      calls += 1;
      return Promise.resolve({
        overall: "A steady recorded week so far.",
        goingWell: "Sleep showed up on the completed nights.",
        attention: "Nothing sharp stands out in the available data.",
        tryToday: "Keep the usual bedtime tonight.",
      });
    };
    const [first, second] = await Promise.all([
      shareInsightRequest("same-day", run),
      shareInsightRequest("same-day", run),
    ]);
    assert.equal(calls, 1);
    assert.equal(first?.tryToday, second?.tryToday);
  });

  it("pauses urgent safety cases and keeps provider failures generic", async () => {
    const { model } = demo();
    assert.equal(insightsPaused(model.status.safety), false);
    assert.equal(insightsPaused({ ...model.status.safety, redirectToCare: true, severity: "urgent", reason: "Seek care." }), true);
    let called = false;
    const missing = await completeInsightRequest("Sleep 7h 35m and steps 7156.", {}, () => {
      called = true;
      return Promise.resolve(new Response(""));
    });
    assert.equal(called, false);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.match(missing.message, /dashboard is still available/);
    const failed = await completeInsightRequest("Sleep 7h 35m and steps 7156.", { GROQ_API_KEY: "test-key" }, async (_input, init) => {
      const requestBody = JSON.parse(String(init?.body));
      assert.equal(requestBody.reasoning_effort, "low");
      assert.equal(requestBody.max_completion_tokens, 1200);
      assert.equal(JSON.stringify(requestBody).includes("test-key"), false);
      return new Response(JSON.stringify({ error: { message: "secret dump" } }), { status: 500 });
    });
    assert.equal(failed.ok, false);
    if (!failed.ok) {
      assert.equal(failed.message.includes("secret dump"), false);
      assert.equal(failed.category, "provider_error");
    }
    const limited = await completeInsightRequest("Sleep 7h 35m and steps 7156.", { GROQ_API_KEY: "test-key" }, async () => new Response("{}", { status: 429 }));
    assert.equal(limited.ok, false);
    if (!limited.ok) assert.equal(limited.category, "provider_rate_limit");
    const empty = await completeInsightRequest("Sleep 7h 35m and steps 7156.", { GROQ_API_KEY: "test-key" }, async () => new Response(JSON.stringify({ choices: [{ message: { content: "" } }] })));
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.category, "invalid_json");
    const timedOut = await completeInsightRequest("Sleep 7h 35m and steps 7156.", { GROQ_API_KEY: "test-key" }, async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });
    assert.equal(timedOut.ok, false);
    if (!timedOut.ok) assert.equal(timedOut.category, "provider_timeout");
  });

  it("keeps insight requests authenticated and separate from chat history", () => {
    const route = readFileSync("src/app/api/insights/route.ts", "utf8");
    const page = readFileSync("src/components/daily-insights.tsx", "utf8");
    assert.match(route, /requireUser\(/);
    assert.match(route, /insights:\$\{user\.id\}/);
    assert.match(route, /demoRuntime\(\) !== "on"/);
    assert.equal(route.includes("coachMessages"), false);
    assert.match(route, /authentication_failed/);
    assert.match(route, /application_rate_limit/);
    assert.match(route, /reportInsight\(/);
    assert.equal(page.includes("GROQ_API_KEY"), false);
    assert.equal(page.includes("coachMessages"), false);
    const empty: DailyObservation[] = [];
    assert.equal(hasInsightMeasurements(empty), false);
  });
});
