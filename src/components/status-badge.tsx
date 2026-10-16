import { cn } from "@/lib/cn";
import { STATE_COPY } from "@/lib/metrics";
import type { WellnessState } from "@/lib/types";

const TONE: Record<WellnessState, string> = {
  thriving: "bg-[#dceee3] text-thrive",
  stable: "bg-[#dce6e8] text-stable",
  shifting: "bg-[#f6e4cc] text-shifting",
  needs_attention: "bg-[#f3d6d6] text-attention",
};

export function StatusBadge({
  state,
  className,
}: {
  state: WellnessState;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
        TONE[state],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATE_COPY[state].label}
    </span>
  );
}

export function SampleMark({ children }: { children?: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-paper-2 px-3 py-2 text-xs leading-5 text-ink-soft">
      {children ??
        "Sample person · simulated wearable and lab data · not a live connection or medical device."}
    </p>
  );
}
