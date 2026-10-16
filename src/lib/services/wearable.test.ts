import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syncRecencyHours, watchFreshness } from "../engines/freshness";
import { DEMO_NOW, DEMO_TODAY } from "../metrics";
import {
  applyFailedSync,
  blankWatchState,
  catchUpPatch,
  importIdForDate,
  mergeWatchImports,
  planSync,
  ramWatchState,
  replaceImports,
} from "./wearable";
import type { DailyObservation, WatchImportRecord } from "../types";

function day(date: string, steps: number): DailyObservation {
  return {
    date,
    sleepHours: 6.4,
    sleepEfficiency: 82,
    bedtimeMinutes: 22 * 60 + 50,
    rhr: 67,
    hrv: 39,
    steps,
    activeMinutes: 48,
    energy: 6,
    stress: 5.5,
    lastMealHour: 20.5,
    proteinBreakfast: true,
    eveningWalkMinutes: 0,
    sources: ["oura"],
    travel: false,
    illness: false,
    unusualSchedule: true,
  };
}

describe("watch merge and freshness", () => {
  it("replaces wearable fields without duplicating the day", () => {
    const base = [day(DEMO_TODAY, 6084)];
    const record: WatchImportRecord = {
      id: importIdForDate(DEMO_TODAY),
      date: DEMO_TODAY,
      importedAt: DEMO_NOW,
      generation: 1,
      patch: catchUpPatch(base[0], 1),
    };
    const merged = mergeWatchImports(base, [record]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.steps, 7920);
    assert.equal(merged[0]?.eveningWalkMinutes, 22);
    assert.ok(merged[0]?.sources.includes("watch"));
    assert.equal(merged[0]?.energy, 6);
  });

  it("does not stack steps on a second import of the same id", () => {
    const first: WatchImportRecord = {
      id: importIdForDate(DEMO_TODAY),
      date: DEMO_TODAY,
      importedAt: DEMO_NOW,
      generation: 1,
      patch: catchUpPatch(day(DEMO_TODAY, 6084), 1),
    };
    const second: WatchImportRecord = {
      ...first,
      generation: 2,
      patch: catchUpPatch(day(DEMO_TODAY, first.patch.steps ?? 0), 2),
    };
    const stored = replaceImports([first], [second]);
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.generation, 2);
    assert.equal(stored[0]?.patch.steps, 7955);
  });

  it("labels Ram’s morning last-sync as needing an update at 18:40", () => {
    const view = watchFreshness(ramWatchState(), DEMO_NOW);
    assert.equal(view.kind, "needs_update");
    const hours = syncRecencyHours(ramWatchState().lastSyncAt, DEMO_NOW);
    assert.ok(hours != null && hours > 11 && hours < 12);
  });

  it("blocks sync when disconnected", () => {
    const plan = planSync(
      { watch: blankWatchState(), watchImports: [], mode: "custom" },
      DEMO_NOW,
    );
    assert.equal(plan.kind, "blocked");
  });

  it("treats a recent catch-up as up to date", () => {
    const plan = planSync(
      {
        watch: { ...ramWatchState(), lastSyncAt: DEMO_NOW },
        watchImports: [
          {
            id: importIdForDate(DEMO_TODAY),
            date: DEMO_TODAY,
            importedAt: DEMO_NOW,
            generation: 1,
            patch: catchUpPatch(undefined, 1),
          },
        ],
        mode: "ram",
      },
      DEMO_NOW,
    );
    assert.equal(plan.kind, "up_to_date");
  });

  it("failed sync clears the fail flag and does not require imports", () => {
    const state = {
      watch: { ...ramWatchState(), failNextSync: true },
      syncHistory: [],
    };
    const next = applyFailedSync(
      state as never,
      DEMO_NOW,
      "Simulated ingest failed. Saved wellness data was not changed.",
    );
    assert.equal(next.watch.failNextSync, false);
    assert.equal(next.syncHistory[0]?.status, "failed");
  });
});
