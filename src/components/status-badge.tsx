import { cn } from "@/lib/cn";
import { STATE_COPY } from "@/lib/metrics";
import type { WellnessState } from "@/lib/types";

const TONE: Record<WellnessState, string> = {
  thriving: "bg-[var(--thrive-soft)] text-thrive",
  stable: "bg-[var(--stable-soft)] text-stable",
  shifting: "bg-[var(--shifting-soft)] text-shifting",
  needs_attention: "bg-[var(--attention-soft)] text-attention",
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
        "Stored account data. Missing measurements stay blank. This is not a medical device."}
    </p>
  );
}
