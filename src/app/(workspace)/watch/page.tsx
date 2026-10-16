"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataFreshnessBar } from "@/components/data-freshness";
import { WatchFace } from "@/components/watch-face";
import { Button, Card, Eyebrow } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { DEMO_NOW } from "@/lib/metrics";
import { WATCH_DEVICE } from "@/lib/services/wearable";
import { useDemo } from "@/lib/store";

const SYNC_STEPS = [
  "Reading overnight sleep",
  "Importing HRV and resting HR",
  "Updating steps and walk detection",
  "Recalculating personal baseline",
];

function SyncProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((value) => Math.min(value + 1, SYNC_STEPS.length - 1));
    }, 260);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="mt-4 text-sm text-pine" aria-live="polite">
      {SYNC_STEPS[step]}…
    </p>
  );
}

function statusLabel(status: string, connected: boolean): string {
  if (status === "connecting") return "Connecting";
  if (status === "syncing") return "Syncing";
  if (connected) return "Connected";
  return "Not connected";
}

export default function WatchPage() {
  const {
    state,
    model,
    connectWatch,
    disconnectWatch,
    syncWatch,
    armSyncFailure,
    dismissWatchNotice,
  } = useDemo();
  const { watch, syncHistory } = state;

  const today = model.observations.find((row) => row.date === model.asOf);
  const canSync = watch.connected && watch.status !== "syncing" && watch.status !== "connecting";
  const noticeTone =
    watch.notice?.kind === "error"
      ? "bg-[#f8ecec] text-attention"
      : watch.notice?.kind === "success"
        ? "bg-[#dceee3] text-thrive"
        : "bg-paper-2 text-ink-soft";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>Wearable</Eyebrow>
        <h1 className="display mt-1 text-3xl">Pulse Watch</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hardware-neutral ingest, simulated. Connecting does not request Bluetooth,
          OAuth, or a vendor account. Sync writes sleep, recovery, and activity into
          the same store used by Today, Trends, Progress, and Coach.
        </p>
      </header>

      <DataFreshnessBar />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <WatchFace status={watch.status} batteryPct={watch.batteryPct} hrv={today?.hrv ?? null} />
          <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {statusLabel(watch.status, watch.connected)}
          </span>
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Last synced</dt>
            <dd>{watch.lastSyncAt ? formatDateTime(watch.lastSyncAt) : "Never"}</dd>
          </div>
          <div>
            <dt className="text-muted">Demo clock</dt>
            <dd>{formatDateTime(DEMO_NOW)}</dd>
          </div>
          <div>
            <dt className="text-muted">Ingest</dt>
            <dd>{WATCH_DEVICE.ingest}</dd>
          </div>
          <div>
            <dt className="text-muted">Today’s watch steps</dt>
            <dd>{today?.steps != null ? today.steps.toLocaleString("en-US") : "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-muted">
          Provides: {WATCH_DEVICE.signals.join(" · ")}
        </p>
        {watch.status === "syncing" ? <SyncProgress /> : null}
        {watch.notice ? (
          <div className={`mt-4 flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm ${noticeTone}`}>
            <p>{watch.notice.message}</p>
            <button type="button" className="text-xs underline" onClick={dismissWatchNotice}>
              Dismiss
            </button>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {!watch.connected ? (
            <Button onClick={() => void connectWatch()} disabled={watch.status === "connecting"}>
              {watch.status === "connecting" ? "Connecting…" : "Connect watch"}
            </Button>
          ) : (
            <>
              <Button
                variant={model.freshness.kind === "needs_update" || model.freshness.kind === "never" ? "one" : "primary"}
                onClick={() => void syncWatch()}
                disabled={!canSync}
              >
                {watch.status === "syncing" ? "Syncing…" : "Sync watch data"}
              </Button>
              {model.freshness.kind === "up_to_date" ? (
                <Button variant="secondary" onClick={() => void syncWatch(true)} disabled={!canSync}>
                  Refresh anyway
                </Button>
              ) : null}
              <Button variant="secondary" onClick={disconnectWatch} disabled={watch.status === "syncing"}>
                Disconnect
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Sync history</h2>
        {syncHistory.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No watch imports yet. Morning vendor history on Ram is seed data, not a completed Pulse Watch sync.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {syncHistory.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium capitalize">{item.status.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted">{formatDateTime(item.finishedAt)}</p>
                </div>
                <p className="mt-1 text-ink-soft">{item.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {item.recordsWritten} new · {item.recordsUpdated} updated
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Demo tools</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Arm a failed sync to confirm stored readings are not corrupted. Reset from Profile restores Ram’s seed, including a stale morning last-sync.
        </p>
        <Button className="mt-3" variant="ghost" onClick={armSyncFailure}>
          Simulate next sync failure
        </Button>
        <p className="mt-3 text-xs text-muted">
          Future real integration replaces <code>src/lib/services/wearable.ts</code> only. UI and engines stay on the merged observation store.
        </p>
        <Link href="/profile/devices" className="mt-3 inline-block text-sm text-pine hover:underline">
          All data sources
        </Link>
      </Card>
    </div>
  );
}
