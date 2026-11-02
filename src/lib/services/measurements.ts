import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Client } from "@libsql/client";
import type { DailyObservation } from "@/lib/types";
import { localDate } from "@/lib/services/workspace";

export const API_VERSION = "1.0.0";
export const MAX_BATCH = 500;

export const METRIC_UNITS = {
  steps: "count",
  active_minutes: "min",
  sleep_hours: "h",
  sleep_efficiency: "percent",
  bedtime_minutes: "min",
  resting_heart_rate: "bpm",
  heart_rate: "bpm",
  hrv_ms: "ms",
  evening_walk_minutes: "min",
} as const;

export type MetricName = keyof typeof METRIC_UNITS;

export type IncomingMeasurement = {
  sourceRecordId?: unknown;
  metric?: unknown;
  value?: unknown;
  unit?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  timezone?: unknown;
};

export type Rejection = {
  sourceRecordId: string;
  code: string;
  message: string;
};

const SUM_METRICS = new Set<MetricName>([
  "steps",
  "active_minutes",
  "sleep_hours",
  "evening_walk_minutes",
]);

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function secretsMatch(storedHash: string, presented: string): boolean {
  const next = Buffer.from(hashSecret(presented), "hex");
  const current = Buffer.from(storedHash, "hex");
  if (next.length !== current.length) return false;
  return timingSafeEqual(next, current);
}

export function validateMeasurement(input: IncomingMeasurement, index: number): {
  ok: true;
  record: {
    sourceRecordId: string;
    metric: MetricName;
    value: number;
    unit: string;
    startTime: string;
    endTime: string | null;
    timezone: string;
  };
} | { ok: false; rejection: Rejection } {
  const sourceRecordId = String(input.sourceRecordId ?? "").slice(0, 160);
  const label = sourceRecordId || `record-${index}`;
  const metric = String(input.metric ?? "");
  if (!(metric in METRIC_UNITS)) {
    return { ok: false, rejection: { sourceRecordId: label, code: "unknown_metric", message: "Metric is not supported." } };
  }
  const expected = METRIC_UNITS[metric as MetricName];
  if (input.unit !== expected) {
    return {
      ok: false,
      rejection: { sourceRecordId: label, code: "invalid_unit", message: `${metric} must use unit ${expected}.` },
    };
  }
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, rejection: { sourceRecordId: label, code: "invalid_value", message: "Value must be a non-negative number." } };
  }
  const start = new Date(String(input.startTime ?? ""));
  if (Number.isNaN(start.getTime())) {
    return { ok: false, rejection: { sourceRecordId: label, code: "invalid_time", message: "startTime must be an ISO-8601 timestamp." } };
  }
  const ahead = start.getTime() - Date.now();
  if (ahead > 24 * 60 * 60 * 1000) {
    return { ok: false, rejection: { sourceRecordId: label, code: "future_time", message: "startTime is too far in the future." } };
  }
  if (!sourceRecordId) {
    return { ok: false, rejection: { sourceRecordId: label, code: "missing_id", message: "sourceRecordId is required." } };
  }
  let endTime: string | null = null;
  if (input.endTime != null && input.endTime !== "") {
    const end = new Date(String(input.endTime));
    if (Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
      return { ok: false, rejection: { sourceRecordId: label, code: "invalid_time", message: "endTime must be an ISO-8601 timestamp after startTime." } };
    }
    endTime = end.toISOString();
  }
  const timezone = String(input.timezone ?? "UTC").slice(0, 64) || "UTC";
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(start);
  } catch {
    return { ok: false, rejection: { sourceRecordId: label, code: "invalid_timezone", message: "timezone must be an IANA name." } };
  }
  return {
    ok: true,
    record: {
      sourceRecordId,
      metric: metric as MetricName,
      value,
      unit: expected,
      startTime: start.toISOString(),
      endTime,
      timezone,
    },
  };
}

export async function findDeviceByToken(client: Client, token: string) {
  const result = await client.execute({
    sql: `SELECT id, user_id, status, categories_json FROM linked_device WHERE token_hash = ?`,
    args: [hashSecret(token)],
  });
  const row = result.rows[0];
  if (!row || row.status !== "active") return null;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    categories: JSON.parse(String(row.categories_json)) as string[],
  };
}

export async function applyBatch(
  client: Client,
  device: { id: string; userId: string },
  records: IncomingMeasurement[],
  idempotencyKey: string | null,
): Promise<{
  accepted: number;
  duplicates: number;
  rejected: Rejection[];
  replayed: boolean;
}> {
  if (idempotencyKey) {
    const existing = await client.execute({
      sql: `SELECT accepted, duplicates, rejected, rejections_json FROM sync_batch
            WHERE device_id = ? AND idempotency_key = ?`,
      args: [device.id, idempotencyKey],
    });
    const row = existing.rows[0];
    if (row) {
      return {
        accepted: Number(row.accepted),
        duplicates: Number(row.duplicates),
        rejected: JSON.parse(String(row.rejections_json)) as Rejection[],
        replayed: true,
      };
    }
  }

  let accepted = 0;
  let duplicates = 0;
  const rejected: Rejection[] = [];
  const seen = new Set<string>();
  const now = new Date().toISOString();

  for (const [index, input] of records.entries()) {
    const parsed = validateMeasurement(input, index);
    if (!parsed.ok) {
      rejected.push(parsed.rejection);
      continue;
    }
    if (seen.has(parsed.record.sourceRecordId)) {
      rejected.push({
        sourceRecordId: parsed.record.sourceRecordId,
        code: "duplicate_in_batch",
        message: "This sourceRecordId appears more than once in the batch.",
      });
      continue;
    }
    seen.add(parsed.record.sourceRecordId);
    const prior = await client.execute({
      sql: "SELECT id FROM measurement WHERE device_id = ? AND source_record_id = ?",
      args: [device.id, parsed.record.sourceRecordId],
    });
    if (prior.rows[0]) {
      duplicates += 1;
      continue;
    }
    await client.execute({
      sql: `INSERT INTO measurement (
        id, user_id, device_id, source_record_id, metric, value, unit, start_time, end_time, timezone, ingested_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        device.userId,
        device.id,
        parsed.record.sourceRecordId,
        parsed.record.metric,
        parsed.record.value,
        parsed.record.unit,
        parsed.record.startTime,
        parsed.record.endTime,
        parsed.record.timezone,
        now,
      ],
    });
    accepted += 1;
  }

  if (accepted > 0) {
    await client.execute({
      sql: "UPDATE linked_device SET last_sync_at = ? WHERE id = ? AND status = 'active'",
      args: [now, device.id],
    });
  }
  await client.execute({
    sql: `INSERT INTO sync_batch (
      id, device_id, user_id, idempotency_key, status, accepted, duplicates, rejected, rejections_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      randomUUID(),
      device.id,
      device.userId,
      idempotencyKey,
      rejected.length && accepted === 0 ? "rejected" : "stored",
      accepted,
      duplicates,
      rejected.length,
      JSON.stringify(rejected),
      now,
    ],
  });

  return { accepted, duplicates, rejected, replayed: false };
}

function emptyDay(date: string): DailyObservation {
  return {
    date,
    sleepHours: null,
    sleepEfficiency: null,
    bedtimeMinutes: null,
    rhr: null,
    hrv: null,
    steps: null,
    activeMinutes: null,
    energy: null,
    stress: null,
    lastMealHour: null,
    proteinBreakfast: null,
    eveningWalkMinutes: null,
    sources: [],
    travel: false,
    illness: false,
    unusualSchedule: false,
  };
}

export async function observationsForUser(
  client: Client,
  userId: string,
  timeZone: string,
): Promise<DailyObservation[]> {
  const result = await client.execute({
    sql: `SELECT metric, value, start_time FROM measurement
          WHERE user_id = ? ORDER BY start_time ASC`,
    args: [userId],
  });
  const days = new Map<string, DailyObservation>();
  const lastStamp = new Map<string, string>();
  for (const row of result.rows) {
    const metric = String(row.metric) as MetricName;
    const value = Number(row.value);
    const start = String(row.start_time);
    const date = localDate(start, timeZone);
    const day = days.get(date) ?? emptyDay(date);
    day.sources = ["companion"];
    const key = `${date}:${metric}`;
    if (SUM_METRICS.has(metric)) {
      if (metric === "steps") day.steps = (day.steps ?? 0) + value;
      if (metric === "active_minutes") day.activeMinutes = (day.activeMinutes ?? 0) + value;
      if (metric === "sleep_hours") day.sleepHours = (day.sleepHours ?? 0) + value;
      if (metric === "evening_walk_minutes") day.eveningWalkMinutes = (day.eveningWalkMinutes ?? 0) + value;
    } else if (!lastStamp.has(key) || start >= (lastStamp.get(key) as string)) {
      lastStamp.set(key, start);
      if (metric === "sleep_efficiency") day.sleepEfficiency = value;
      if (metric === "bedtime_minutes") day.bedtimeMinutes = value;
      if (metric === "resting_heart_rate") day.rhr = value;
      if (metric === "hrv_ms") day.hrv = value;
    }
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
