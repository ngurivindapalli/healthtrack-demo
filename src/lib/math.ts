export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function mad(values: number[], med: number): number {
  if (values.length === 0) return 0;
  return median(values.map((value) => Math.abs(value - med))) ?? 0;
}

/** Robust z using median and MAD, with a floor so quiet signals still move. */
export function robustZ(
  value: number,
  med: number,
  madValue: number,
): number {
  const scale = 1.4826 * Math.max(madValue, 0.08);
  return (value - med) / scale;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function tanh(value: number): number {
  return Math.tanh(value);
}

export function pctChange(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return (current - baseline) / baseline;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(rng: () => number, mu: number, sigma: number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  const mag = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mu + sigma * mag;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
