import { cn } from "@/lib/cn";
import type { WatchLinkStatus } from "@/lib/types";

export function WatchFace({
  status,
  batteryPct,
  hrv,
}: {
  status: WatchLinkStatus;
  batteryPct: number;
  hrv: number | null;
}) {
  const live = status === "connected" || status === "syncing";
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative h-28 w-20 rounded-[1.6rem] border-4 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
          live ? "border-ink bg-ink" : "border-ink-soft bg-[#2a3830]",
        )}
        aria-hidden
      >
        <div className="absolute -top-1 left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-b-sm bg-ink" />
        <div className="flex h-full flex-col items-center justify-between rounded-[1.1rem] bg-gradient-to-b from-[#1f3d31] to-[#101c16] px-1.5 py-2 text-center">
          <p className="text-[8px] uppercase tracking-[0.14em] text-sage">Pulse</p>
          <p className="display text-lg leading-none text-surface">
            {live ? "HRV" : "—"}
          </p>
          <p className="text-[10px] text-sage">
            {live ? (hrv != null ? `${Math.round(hrv)} ms` : "—") : "offline"}
          </p>
          <div className="h-6 w-full overflow-hidden">
            <svg viewBox="0 0 60 16" className="h-6 w-full">
              <polyline
                fill="none"
                stroke={live ? "#c45c24" : "#6b7871"}
                strokeWidth="1.6"
                points={
                  live
                    ? "0,10 8,10 12,4 16,12 22,8 28,9 34,3 40,11 46,7 52,8 60,6"
                    : "0,8 60,8"
                }
              />
            </svg>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold">Pulse Watch · PW-1</p>
        <p className="mt-1 text-xs text-muted">HealthTrack demo wearable</p>
        <p className="mt-2 text-xs text-ink-soft">
          Battery {batteryPct}% · Simulated Junction ingest
        </p>
      </div>
    </div>
  );
}
