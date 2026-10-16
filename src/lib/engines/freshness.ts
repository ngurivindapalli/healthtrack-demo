import { FRESHNESS_HOURS } from "@/lib/metrics";
import type { FreshnessKind, WatchState } from "@/lib/types";

export interface FreshnessView {
  kind: FreshnessKind;
  label: string;
  hoursAgo: number | null;
  lastSyncAt: string | null;
}

export function syncRecencyHours(lastSyncAt: string | null, nowIso: string): number | null {
  if (!lastSyncAt) return null;
  return hoursBetween(lastSyncAt, nowIso);
}

function hoursBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return (to - from) / 3_600_000;
}

export function watchFreshness(
  watch: WatchState,
  nowIso: string,
): FreshnessView {
  if (watch.status === "syncing") {
    return {
      kind: "syncing",
      label: "Syncing watch data…",
      hoursAgo: watch.lastSyncAt ? hoursBetween(watch.lastSyncAt, nowIso) : null,
      lastSyncAt: watch.lastSyncAt,
    };
  }
  if (!watch.connected || watch.status === "disconnected") {
    return {
      kind: "disconnected",
      label: "Watch disconnected",
      hoursAgo: watch.lastSyncAt ? hoursBetween(watch.lastSyncAt, nowIso) : null,
      lastSyncAt: watch.lastSyncAt,
    };
  }
  if (!watch.lastSyncAt) {
    return {
      kind: "never",
      label: "Never synced",
      hoursAgo: null,
      lastSyncAt: null,
    };
  }
  const hoursAgo = hoursBetween(watch.lastSyncAt, nowIso);
  if (hoursAgo >= FRESHNESS_HOURS) {
    const rounded = Math.max(1, Math.round(hoursAgo));
    return {
      kind: "needs_update",
      label: `Last updated ${rounded} hour${rounded === 1 ? "" : "s"} ago`,
      hoursAgo,
      lastSyncAt: watch.lastSyncAt,
    };
  }
  if (hoursAgo < 0.08) {
    return {
      kind: "up_to_date",
      label: "Up to date",
      hoursAgo,
      lastSyncAt: watch.lastSyncAt,
    };
  }
  const minutes = Math.max(1, Math.round(hoursAgo * 60));
  return {
    kind: "up_to_date",
    label:
      minutes < 60
        ? `Synced ${minutes} min ago`
        : `Synced ${Math.round(hoursAgo)} hour${Math.round(hoursAgo) === 1 ? "" : "s"} ago`,
    hoursAgo,
    lastSyncAt: watch.lastSyncAt,
  };
}

export function isFresh(watch: WatchState, nowIso: string): boolean {
  return watchFreshness(watch, nowIso).kind === "up_to_date";
}
