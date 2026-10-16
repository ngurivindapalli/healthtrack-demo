"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import type { FreshnessView } from "@/lib/engines/freshness";
import { useDemo } from "@/lib/store";

export function DataFreshnessBar() {
  const { model, state, syncWatch } = useDemo();
  const freshness: FreshnessView = model.freshness;
  const syncing = state.watch.status === "syncing";
  const canSync = state.watch.connected && !syncing;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 hairline">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Watch data
        </p>
        <p className="mt-1 text-sm text-ink">
          {syncing ? "Syncing Pulse Watch…" : freshness.label}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          Sleep, recovery, and activity from the simulated watch. Labs and check-ins are separate.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {freshness.kind === "disconnected" || freshness.kind === "never" ? (
          <Link
            href="/watch"
            className="inline-flex items-center rounded-full bg-pine px-4 py-2 text-sm font-medium text-surface hover:bg-pine-2"
          >
            {freshness.kind === "disconnected" ? "Connect watch" : "Sync watch data"}
          </Link>
        ) : (
          <Button
            onClick={() => void syncWatch()}
            disabled={!canSync}
            variant={freshness.kind === "needs_update" ? "one" : "secondary"}
          >
            {syncing ? "Syncing…" : "Sync watch data"}
          </Button>
        )}
        <Link href="/watch" className="text-sm font-medium text-pine hover:underline">
          Watch
        </Link>
      </div>
    </div>
  );
}
