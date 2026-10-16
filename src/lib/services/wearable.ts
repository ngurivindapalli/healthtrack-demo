/**
 * Simulated Junction wearable adapter.
 *
 * Connect / disconnect / fetchBatch / normalize / import are the seam a real
 * wearable API would replace. The UI should keep calling these operations.
 */
import { generateObservations } from "@/lib/data/observations";
import { addDays } from "@/lib/math";
import { DEMO_NOW, DEMO_TODAY } from "@/lib/metrics";
import type {
  ConnectedSource,
  DailyObservation,
  DemoState,
  SyncHistoryItem,
  WatchImportRecord,
  WatchState,
  WearablePatch,
} from "@/lib/types";

export const WATCH_DEVICE = {
  id: "pulse-watch-demo",
  name: "Pulse Watch",
  manufacturer: "HealthTrack demo",
  model: "PW-1",
  ingest: "Simulated Junction ingest",
  signals: [
    "Sleep duration and efficiency",
    "Bedtime",
    "Resting heart rate",
    "HRV",
    "Steps",
    "Active minutes",
    "Walk detection",
  ],
} as const;

export const WATCH_SOURCE: ConnectedSource = {
  kind: "watch",
  label: "Pulse Watch",
  connected: false,
  lastSync: null,
  coverage30d: null,
  permissions: ["sleep", "recovery", "activity"],
  simulated: true,
};

export function ramWatchState(): WatchState {
  return {
    connected: true,
    status: "connected",
    lastSyncAt: `${DEMO_TODAY}T07:12:00Z`,
    batteryPct: 68,
    failNextSync: false,
    notice: null,
  };
}

export function blankWatchState(): WatchState {
  return {
    connected: false,
    status: "disconnected",
    lastSyncAt: null,
    batteryPct: 81,
    failNextSync: false,
    notice: null,
  };
}

export function coerceWatchStatus(watch: WatchState): WatchState {
  if (watch.status === "connecting" || watch.status === "syncing") {
    return {
      ...watch,
      status: watch.connected ? "connected" : "disconnected",
    };
  }
  if (!watch.connected) return { ...watch, status: "disconnected" };
  return { ...watch, status: "connected" };
}

export function upsertWatchSource(
  sources: ConnectedSource[],
  connected: boolean,
  lastSync: string | null,
): ConnectedSource[] {
  const next = sources.filter((source) => source.kind !== "watch");
  next.push({
    ...WATCH_SOURCE,
    connected,
    lastSync,
    coverage30d: connected ? 0.94 : null,
  });
  return next;
}

export function importIdForDate(date: string): string {
  return `watch:${date}`;
}

export function emptyDay(date: string): DailyObservation {
  return {
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
    sources: ["watch"],
    travel: false,
    illness: false,
    unusualSchedule: false,
  };
}

export function catchUpPatch(
  existing: DailyObservation | undefined,
  generation: number,
): WearablePatch {
  const g = Math.max(1, generation);
  const stepTarget = 7920 + ((g - 1) % 5) * 35;
  const activeTarget = 74 + ((g - 1) % 5) * 2;
  return {
    sleepHours: 6.52,
    sleepEfficiency: 83.4,
    bedtimeMinutes: 22 * 60 + 48,
    rhr: 65,
    hrv: 41.4,
    steps: Math.max(stepTarget, existing?.steps ?? 0),
    activeMinutes: Math.max(activeTarget, existing?.activeMinutes ?? 0),
    eveningWalkMinutes: 22,
  };
}

export function mergeWatchImports(
  base: DailyObservation[],
  imports: WatchImportRecord[],
): DailyObservation[] {
  const byDate = new Map<string, DailyObservation>();
  for (const row of base) {
    byDate.set(row.date, { ...row });
  }
  for (const record of imports) {
    const current = byDate.get(record.date) ?? emptyDay(record.date);
    const sources = Array.from(
      new Set([...current.sources, "watch" as const]),
    );
    byDate.set(record.date, {
      ...current,
      sleepHours: record.patch.sleepHours,
      sleepEfficiency: record.patch.sleepEfficiency,
      bedtimeMinutes: record.patch.bedtimeMinutes,
      rhr: record.patch.rhr,
      hrv: record.patch.hrv,
      steps: record.patch.steps,
      activeMinutes: record.patch.activeMinutes,
      eveningWalkMinutes: record.patch.eveningWalkMinutes,
      sources,
    });
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function buildHistoryImports(
  asOf: string,
  importedAt: string,
): WatchImportRecord[] {
  const days = generateObservations({
    seed: 77,
    days: 12,
    endDate: asOf,
    applyRecentShift: false,
    sources: ["watch"],
  });
  return days.map((row) => ({
    id: importIdForDate(row.date),
    date: row.date,
    importedAt,
    generation: 1,
    patch: {
      sleepHours: row.sleepHours,
      sleepEfficiency: row.sleepEfficiency,
      bedtimeMinutes: row.bedtimeMinutes,
      rhr: row.rhr,
      hrv: row.hrv,
      steps: row.steps,
      activeMinutes: row.activeMinutes,
      eveningWalkMinutes: row.eveningWalkMinutes,
    },
  }));
}

export function buildCatchUpImports(input: {
  asOf: string;
  existing: DailyObservation[];
  previous: WatchImportRecord[];
  importedAt: string;
}): { records: WatchImportRecord[]; written: number; updated: number } {
  const dates = [addDays(input.asOf, -1), input.asOf];
  const records: WatchImportRecord[] = [];
  let written = 0;
  let updated = 0;
  for (const date of dates) {
    const prior = input.previous.find((item) => item.date === date);
    const generation = (prior?.generation ?? 0) + 1;
    const existing = input.existing.find((row) => row.date === date);
    records.push({
      id: importIdForDate(date),
      date,
      importedAt: input.importedAt,
      generation,
      patch: catchUpPatch(existing, generation),
    });
    if (prior) updated += 1;
    else written += 1;
  }
  return { records, written, updated };
}

export function replaceImports(
  previous: WatchImportRecord[],
  incoming: WatchImportRecord[],
): WatchImportRecord[] {
  const byId = new Map(previous.map((item) => [item.id, item]));
  for (const record of incoming) {
    byId.set(record.id, record);
  }
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface SyncPlan {
  kind: "up_to_date" | "history" | "catch-up" | "blocked" | "failed";
  message: string;
}

export function planSync(
  state: Pick<DemoState, "watch" | "watchImports" | "mode">,
  nowIso: string,
): SyncPlan {
  if (!state.watch.connected || state.watch.status === "disconnected") {
    return {
      kind: "blocked",
      message: "Connect Pulse Watch before syncing. No Bluetooth or vendor login is used — this is a simulated Junction link.",
    };
  }
  if (state.watch.failNextSync) {
    return {
      kind: "failed",
      message: "Simulated ingest failed. Saved wellness data was not changed.",
    };
  }
  if (state.watch.status === "syncing") {
    return {
      kind: "blocked",
      message: "A sync is already in progress.",
    };
  }
  const last = state.watch.lastSyncAt;
  if (last) {
    const hours = (new Date(nowIso).getTime() - new Date(last).getTime()) / 3_600_000;
    const hasToday = state.watchImports.some((item) => item.date === DEMO_TODAY);
    if (hours < 4 && hasToday) {
      return {
        kind: "up_to_date",
        message: "Watch data is already current. No duplicate readings were added.",
      };
    }
  }
  if (state.watchImports.length === 0 && state.mode !== "ram") {
    return {
      kind: "history",
      message: "Imported a 12-day Pulse Watch history (simulated).",
    };
  }
  return {
    kind: "catch-up",
    message: "Imported an evening catch-up from Pulse Watch (simulated).",
  };
}

export function applySuccessfulSync(
  state: DemoState,
  existing: DailyObservation[],
  nowIso: string,
  plan: { kind: "history" | "catch-up"; message: string },
): Pick<DemoState, "watch" | "watchImports" | "syncHistory" | "sources"> {
  const startedAt = nowIso;
  const incoming =
    plan.kind === "history"
      ? {
          records: buildHistoryImports(DEMO_TODAY, nowIso),
          written: 12,
          updated: 0,
        }
      : buildCatchUpImports({
          asOf: DEMO_TODAY,
          existing,
          previous: state.watchImports,
          importedAt: nowIso,
        });
  const historyItem: SyncHistoryItem = {
    id: `sync-${nowIso}-${incoming.records[0]?.generation ?? 1}`,
    startedAt,
    finishedAt: nowIso,
    status: "success",
    message: plan.message,
    recordsWritten: incoming.written,
    recordsUpdated: incoming.updated,
  };
  return {
    watch: {
      ...state.watch,
      connected: true,
      status: "connected",
      lastSyncAt: nowIso,
      failNextSync: false,
      notice: {
        kind: "success",
        message: `${plan.message} Today’s steps, recovery, and walk detection were written into the shared store.`,
      },
    },
    watchImports: replaceImports(state.watchImports, incoming.records),
    syncHistory: [historyItem, ...state.syncHistory].slice(0, 8),
    sources: upsertWatchSource(state.sources, true, nowIso),
  };
}

export function applyUpToDateSync(
  state: DemoState,
  nowIso: string,
  message: string,
): Pick<DemoState, "watch" | "syncHistory"> {
  const historyItem: SyncHistoryItem = {
    id: `sync-current-${nowIso}`,
    startedAt: nowIso,
    finishedAt: nowIso,
    status: "up_to_date",
    message,
    recordsWritten: 0,
    recordsUpdated: 0,
  };
  return {
    watch: {
      ...state.watch,
      status: "connected",
      notice: { kind: "info", message },
    },
    syncHistory: [historyItem, ...state.syncHistory].slice(0, 8),
  };
}

export function applyFailedSync(
  state: DemoState,
  nowIso: string,
  message: string,
): Pick<DemoState, "watch" | "syncHistory"> {
  const historyItem: SyncHistoryItem = {
    id: `sync-fail-${nowIso}`,
    startedAt: nowIso,
    finishedAt: nowIso,
    status: "failed",
    message,
    recordsWritten: 0,
    recordsUpdated: 0,
  };
  return {
    watch: {
      ...state.watch,
      status: state.watch.connected ? "connected" : "disconnected",
      failNextSync: false,
      notice: { kind: "error", message },
    },
    syncHistory: [historyItem, ...state.syncHistory].slice(0, 8),
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export { DEMO_NOW };
