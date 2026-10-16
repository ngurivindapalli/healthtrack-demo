import { cn } from "@/lib/cn";

export function Sparkline({
  values,
  className,
  invert = false,
  tone = "pine",
}: {
  values: Array<number | null>;
  className?: string;
  invert?: boolean;
  tone?: "pine" | "one" | "muted";
}) {
  const numeric = values.filter((v): v is number => typeof v === "number");
  if (numeric.length < 2) {
    return <div className={cn("h-8 w-24 rounded bg-paper-2", className)} />;
  }
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = Math.max(max - min, 0.01);
  const w = 120;
  const h = 32;
  const pts = values
    .map((value, i) => {
      if (value == null) return null;
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const yNorm = (value - min) / span;
      const y = invert ? yNorm * (h - 4) + 2 : (1 - yNorm) * (h - 4) + 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
  const color =
    tone === "one" ? "var(--one)" : tone === "muted" ? "var(--muted)" : "var(--pine)";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-8 w-24 overflow-visible", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

export function TrendChart({
  values,
  baseline,
  band,
  label,
  invert = false,
}: {
  values: { date: string; value: number | null }[];
  baseline: number | null;
  band: number | null;
  label: string;
  invert?: boolean;
}) {
  const numeric = values
    .map((item, i) => ({ i, ...item }))
    .filter((item): item is { i: number; date: string; value: number } => item.value != null);
  if (numeric.length < 2) {
    return (
      <p className="text-sm text-muted">Not enough points to draw {label}.</p>
    );
  }
  const nums = numeric.map((item) => item.value);
  const min = Math.min(...nums, baseline != null ? baseline - (band ?? 0) : nums[0]);
  const max = Math.max(...nums, baseline != null ? baseline + (band ?? 0) : nums[0]);
  const span = Math.max(max - min, 0.01);
  const w = 640;
  const h = 180;
  const pad = 8;
  const y = (value: number) => {
    const n = (value - min) / span;
    return invert ? pad + n * (h - pad * 2) : pad + (1 - n) * (h - pad * 2);
  };
  const x = (i: number) => pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
  const d = numeric
    .map((item, idx) => `${idx === 0 ? "M" : "L"} ${x(item.i).toFixed(1)} ${y(item.value).toFixed(1)}`)
    .join(" ");
  const last4Start = Math.max(0, values.length - 4);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" role="img" aria-label={label}>
      {baseline != null && band != null ? (
        <rect
          x={pad}
          y={Math.min(y(baseline + band), y(baseline - band))}
          width={w - pad * 2}
          height={Math.abs(y(baseline + band) - y(baseline - band))}
          fill="#d7ecdf"
          opacity="0.7"
        />
      ) : null}
      {baseline != null ? (
        <line
          x1={pad}
          x2={w - pad}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke="var(--pine)"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
      ) : null}
      <rect
        x={x(last4Start)}
        y={pad}
        width={x(values.length - 1) - x(last4Start)}
        height={h - pad * 2}
        fill="#f6e6d7"
        opacity="0.55"
      />
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="2" />
    </svg>
  );
}
