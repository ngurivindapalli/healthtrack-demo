const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatLongDate(isoDate: string): string {
  return DATE_FMT.format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatShortDate(isoDate: string): string {
  return SHORT_DATE.format(new Date(`${isoDate}T12:00:00Z`));
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatSignedPct(fraction: number, digits = 0): string {
  const pct = fraction * 100;
  const abs = Math.abs(pct).toFixed(digits);
  if (pct > 0.05) return `+${abs}%`;
  if (pct < -0.05) return `−${abs}%`;
  return `${abs}%`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toFixed(digits);
}

export function minutesToClock(minutes: number): string {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function greetingForName(name: string): string {
  const first = name.split(" ")[0] ?? name;
  return `Good evening, ${first}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}
