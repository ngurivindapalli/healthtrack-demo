import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SCORE_NOT_A_DIAGNOSIS, WellnessScoreCard } from "@/components/wellness-panel";
import { formatDisplayedScore } from "@/lib/format";
import { aggregateWellness, PILLAR_WEIGHTS } from "@/lib/services/wellness-score";

describe("wellness score display", () => {
  it("rounds displayed scores and leaves the calculated score unchanged", () => {
    const nutrition = 96.33333333333334;
    const sleep = 98.125;
    const activity = 100;
    const recovery = 73;
    const result = aggregateWellness({
      pillars: [
        { id: "nutrition", score: nutrition, records: 3, inputRefs: ["meal:1"], sources: ["manual"] },
        { id: "sleep", score: sleep, records: 1, inputRefs: ["sleep:1"], sources: ["manual"] },
        { id: "activity", score: activity, records: 1, inputRefs: ["activity:1"], sources: ["manual"] },
        { id: "recovery", score: recovery, records: 1, inputRefs: ["recovery:1"], sources: ["manual"] },
      ],
      userId: "user-a",
      scoreDate: "2026-11-05",
      calculatedAt: "2026-11-05T18:00:00.000Z",
      history: [],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const exact = (nutrition * 25 + sleep * 30 + activity * 25 + recovery * 20) / 100;
    assert.equal(result.exactScore, exact);
    assert.notEqual(result.exactScore, result.displayScore);
    assert.equal(result.pillars.find((pillar) => pillar.id === "nutrition")?.score, nutrition);
    assert.equal(result.pillars.find((pillar) => pillar.id === "sleep")?.score, sleep);
    assert.deepEqual(PILLAR_WEIGHTS, { nutrition: 25, sleep: 30, activity: 25, recovery: 20 });

    const html = renderToStaticMarkup(<WellnessScoreCard assessment={result} />);
    assert.match(html, /Nutrition · 25%/);
    assert.match(html, /Sleep · 30%/);
    assert.match(html, /Activity · 25%/);
    assert.match(html, /Recovery · 20%/);
    assert.match(html, />96</);
    assert.match(html, />98</);
    assert.match(html, />100</);
    assert.match(html, />73</);
    assert.match(html, />93</);
    assert.match(html, new RegExp(SCORE_NOT_A_DIAGNOSIS));
    const text = html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(text, /\d+\.\d+/);
    assert.doesNotMatch(html, /Hydration/);
    assert.doesNotMatch(html, /nonclinical wellness indicator/);
    assert.doesNotMatch(html, /Meal logging measures/);
    assert.doesNotMatch(html, /is eligible/);
    assert.doesNotMatch(html, /NaN/);
  });

  it("shows a safe label for missing and non-finite scores", () => {
    assert.equal(formatDisplayedScore(null), null);
    assert.equal(formatDisplayedScore(undefined), null);
    assert.equal(formatDisplayedScore(Number.NaN), null);
    assert.equal(formatDisplayedScore(Number.POSITIVE_INFINITY), null);
    assert.equal(formatDisplayedScore(98.125), "98");

    const html = renderToStaticMarkup(
      <WellnessScoreCard
        assessment={{
          status: "insufficient",
          displayScore: null,
          message: "Not enough data to calculate your Wellness Score.",
          detail: "At least three eligible pillar scores are required.",
          pillars: [
            { id: "nutrition", score: Number.NaN, eligible: true, weight: 25 },
            { id: "sleep", score: null, eligible: false, weight: 30 },
            { id: "activity", score: null, eligible: false, weight: 25 },
            { id: "recovery", score: null, eligible: false, weight: 20 },
          ],
          personalComparison: { message: "Your personal baseline is still building." },
          populationComparison: { message: "Population comparison unavailable." },
        }}
      />,
    );
    assert.match(html, /Nutrition/);
    assert.match(html, /Sleep/);
    assert.match(html, /Activity/);
    assert.match(html, /Recovery/);
    assert.doesNotMatch(html, /NaN/);
    assert.doesNotMatch(html, /Hydration/);
    assert.equal(html.match(/Missing/g)?.length, 4);
  });
});
