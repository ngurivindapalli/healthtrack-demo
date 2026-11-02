"use client";

import Link from "next/link";
import type { FreshnessView } from "@/lib/engines/freshness";
import { useDemo } from "@/lib/store";

export function DataFreshnessBar() {
  const { model } = useDemo();
  const freshness: FreshnessView = model.freshness;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 hairline">
      <div>
        <p className="text-[13px] font-medium text-muted">Companion app</p>
        <p className="mt-1 text-sm text-ink">{freshness.label}</p>
        <p className="mt-0.5 text-xs text-muted">
          Measurements appear here only after the mobile app uploads them. Nothing on this page is a live watch connection.
        </p>
      </div>
      <Link
        href="/profile/devices"
        className="inline-flex items-center rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-surface hover:bg-pine-2"
      >
        Devices
      </Link>
    </div>
  );
}
