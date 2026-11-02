import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";

export const LOG_KINDS = ["meal", "hydration", "sleep", "workout", "recovery"] as const;
export type LogKind = (typeof LOG_KINDS)[number];

function day(value: unknown): string | null {
  const text = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function optionalNumber(value: unknown, min: number, max: number): number | null | "invalid" {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return "invalid";
  return number;
}

function text(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function listLogs(client: Client, userId: string, kind: LogKind) {
  if (kind === "meal") {
    const rows = await client.execute({
      sql: "SELECT * FROM meal_log WHERE user_id = ? ORDER BY logged_on DESC, created_at DESC",
      args: [userId],
    });
    return rows.rows;
  }
  if (kind === "hydration") {
    const rows = await client.execute({
      sql: "SELECT * FROM hydration_log WHERE user_id = ? ORDER BY logged_on DESC, created_at DESC",
      args: [userId],
    });
    const target = await client.execute({
      sql: "SELECT milliliters FROM hydration_target WHERE user_id = ?",
      args: [userId],
    });
    return { entries: rows.rows, targetMilliliters: Number(target.rows[0]?.milliliters ?? 2000) };
  }
  if (kind === "sleep") {
    const rows = await client.execute({
      sql: "SELECT * FROM sleep_log WHERE user_id = ? ORDER BY start_time DESC",
      args: [userId],
    });
    return rows.rows;
  }
  if (kind === "workout") {
    const rows = await client.execute({
      sql: "SELECT * FROM workout_log WHERE user_id = ? ORDER BY started_at DESC",
      args: [userId],
    });
    return rows.rows;
  }
  const rows = await client.execute({
    sql: "SELECT * FROM recovery_log WHERE user_id = ? ORDER BY logged_on DESC",
    args: [userId],
  });
  return rows.rows;
}

export async function createLog(client: Client, userId: string, kind: LogKind, body: Record<string, unknown>) {
  const now = new Date().toISOString();
  const id = randomUUID();
  if (kind === "meal") {
    const loggedOn = day(body.loggedOn);
    const name = text(body.name, 120);
    if (!loggedOn || !name) return { error: "A date and meal name are required." };
    const calories = optionalNumber(body.calories, 0, 20000);
    const protein = optionalNumber(body.proteinG, 0, 1000);
    const carbs = optionalNumber(body.carbsG, 0, 2000);
    const fat = optionalNumber(body.fatG, 0, 1000);
    if ([calories, protein, carbs, fat].includes("invalid")) return { error: "Nutrition numbers are out of range." };
    await client.execute({
      sql: `INSERT INTO meal_log (id, user_id, logged_on, name, notes, calories, protein_g, carbs_g, fat_g, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
      args: [id, userId, loggedOn, name, text(body.notes, 500), calories, protein, carbs, fat, now, now],
    });
    return { id };
  }
  if (kind === "hydration") {
    const loggedOn = day(body.loggedOn);
    const milliliters = optionalNumber(body.milliliters, 1, 5000);
    if (!loggedOn || milliliters == null || milliliters === "invalid") return { error: "Enter a date and 1–5000 ml." };
    await client.execute({
      sql: "INSERT INTO hydration_log (id, user_id, logged_on, milliliters, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [id, userId, loggedOn, milliliters, now],
    });
    return { id };
  }
  if (kind === "sleep") {
    const start = new Date(String(body.startTime ?? ""));
    const end = new Date(String(body.endTime ?? ""));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return { error: "Sleep end must be after the start." };
    }
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (hours > 24) return { error: "Sleep entries must be 24 hours or less." };
    await client.execute({
      sql: `INSERT INTO sleep_log (id, user_id, start_time, end_time, duration_hours, notes, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
      args: [id, userId, start.toISOString(), end.toISOString(), Math.round(hours * 100) / 100, text(body.notes, 500), now, now],
    });
    return { id, durationHours: Math.round(hours * 100) / 100 };
  }
  if (kind === "workout") {
    const started = new Date(String(body.startedAt ?? ""));
    const name = text(body.name, 120);
    const minutes = optionalNumber(body.minutes, 1, 600);
    if (Number.isNaN(started.getTime()) || !name || minutes == null || minutes === "invalid") {
      return { error: "A start time, name, and 1–600 minutes are required." };
    }
    await client.execute({
      sql: `INSERT INTO workout_log (id, user_id, started_at, name, minutes, notes, source, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
      args: [id, userId, started.toISOString(), name, minutes, text(body.notes, 500), now, now],
    });
    return { id };
  }
  const loggedOn = day(body.loggedOn);
  const energy = optionalNumber(body.energy, 0, 10);
  const fatigue = optionalNumber(body.fatigue, 0, 10);
  const stress = optionalNumber(body.stress, 0, 10);
  const soreness = optionalNumber(body.soreness, 0, 10);
  if (!loggedOn || [energy, fatigue, stress, soreness].includes("invalid")) return { error: "Use a date and 0–10 ratings." };
  if (energy == null && fatigue == null && stress == null && soreness == null) return { error: "Enter at least one recovery rating." };
  await client.execute({
    sql: `INSERT INTO recovery_log (id, user_id, logged_on, energy, fatigue, stress, soreness, notes, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?)`,
    args: [id, userId, loggedOn, energy, fatigue, stress, soreness, text(body.notes, 500), now, now],
  });
  return { id };
}

const TABLES: Record<LogKind, string> = {
  meal: "meal_log",
  hydration: "hydration_log",
  sleep: "sleep_log",
  workout: "workout_log",
  recovery: "recovery_log",
};

export async function deleteLog(client: Client, userId: string, kind: LogKind, id: string) {
  const result = await client.execute({
    sql: `DELETE FROM ${TABLES[kind]} WHERE id = ? AND user_id = ?`,
    args: [id, userId],
  });
  return Number(result.rowsAffected) > 0;
}

export async function updateLog(client: Client, userId: string, kind: LogKind, id: string, body: Record<string, unknown>) {
  const now = new Date().toISOString();
  if (kind === "meal") {
    const loggedOn = day(body.loggedOn);
    const name = text(body.name, 120);
    if (!loggedOn || !name) return { error: "A date and meal name are required." };
    const calories = optionalNumber(body.calories, 0, 20000);
    const protein = optionalNumber(body.proteinG, 0, 1000);
    const carbs = optionalNumber(body.carbsG, 0, 2000);
    const fat = optionalNumber(body.fatG, 0, 1000);
    if ([calories, protein, carbs, fat].includes("invalid")) return { error: "Nutrition numbers are out of range." };
    const result = await client.execute({
      sql: "UPDATE meal_log SET logged_on = ?, name = ?, notes = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      args: [loggedOn, name, text(body.notes, 500), calories, protein, carbs, fat, now, id, userId],
    });
    return Number(result.rowsAffected) > 0 ? { id } : { error: "Meal was not found." };
  }
  if (kind === "hydration") {
    const loggedOn = day(body.loggedOn);
    const milliliters = optionalNumber(body.milliliters, 1, 5000);
    if (!loggedOn || milliliters == null || milliliters === "invalid") return { error: "Enter a date and 1–5000 ml." };
    const result = await client.execute({
      sql: "UPDATE hydration_log SET logged_on = ?, milliliters = ? WHERE id = ? AND user_id = ?",
      args: [loggedOn, milliliters, id, userId],
    });
    return Number(result.rowsAffected) > 0 ? { id } : { error: "Hydration entry was not found." };
  }
  if (kind === "sleep") {
    const start = new Date(String(body.startTime ?? ""));
    const end = new Date(String(body.endTime ?? ""));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return { error: "Sleep end must be after the start." };
    const hours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
    const result = await client.execute({
      sql: "UPDATE sleep_log SET start_time = ?, end_time = ?, duration_hours = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      args: [start.toISOString(), end.toISOString(), hours, text(body.notes, 500), now, id, userId],
    });
    return Number(result.rowsAffected) > 0 ? { id } : { error: "Sleep entry was not found." };
  }
  if (kind === "workout") {
    const name = text(body.name, 120);
    const minutes = optionalNumber(body.minutes, 1, 600);
    if (!name || minutes == null || minutes === "invalid") return { error: "A name and 1–600 minutes are required." };
    const result = await client.execute({
      sql: "UPDATE workout_log SET name = ?, minutes = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      args: [name, minutes, text(body.notes, 500), now, id, userId],
    });
    return Number(result.rowsAffected) > 0 ? { id } : { error: "Workout was not found." };
  }
  if (kind === "recovery") {
    const energy = optionalNumber(body.energy, 0, 10);
    const fatigue = optionalNumber(body.fatigue, 0, 10);
    const stress = optionalNumber(body.stress, 0, 10);
    const soreness = optionalNumber(body.soreness, 0, 10);
    if ([energy, fatigue, stress, soreness].includes("invalid")) return { error: "Ratings must be 0–10." };
    const result = await client.execute({
      sql: "UPDATE recovery_log SET energy = ?, fatigue = ?, stress = ?, soreness = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      args: [energy, fatigue, stress, soreness, text(body.notes, 500), now, id, userId],
    });
    return Number(result.rowsAffected) > 0 ? { id } : { error: "Check-in was not found." };
  }
  return { error: "That record could not be edited." };
}

export async function setHydrationTarget(client: Client, userId: string, milliliters: number) {
  if (!Number.isFinite(milliliters) || milliliters < 250 || milliliters > 8000) return { error: "Target must be 250–8000 ml." };
  await client.execute({
    sql: `INSERT INTO hydration_target (user_id, milliliters) VALUES (?, ?)
          ON CONFLICT(user_id) DO UPDATE SET milliliters = excluded.milliliters`,
    args: [userId, milliliters],
  });
  return { milliliters };
}

export async function contributorCounts(client: Client, userId: string) {
  const tables = ["meal_log", "sleep_log", "workout_log", "recovery_log"] as const;
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const result = await client.execute({
      sql: `SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`,
      args: [userId],
    });
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }
  return {
    nutrition: counts.meal_log,
    sleep: counts.sleep_log,
    activity: counts.workout_log,
    recovery: counts.recovery_log,
  };
}

export async function readCycle(client: Client, userId: string) {
  const consent = await client.execute({ sql: "SELECT * FROM cycle_consent WHERE user_id = ?", args: [userId] });
  const entries = await client.execute({
    sql: "SELECT * FROM cycle_entry WHERE user_id = ? ORDER BY logged_on DESC",
    args: [userId],
  });
  return { consent: consent.rows[0] ?? null, entries: entries.rows };
}

export async function cycleContextForAuthorizedUse(client: Client, userId: string) {
  const consent = await client.execute({
    sql: "SELECT enabled FROM cycle_consent WHERE user_id = ?",
    args: [userId],
  });
  if (Number(consent.rows[0]?.enabled ?? 0) !== 1) return null;
  return readCycle(client, userId);
}

export async function saveCycleConsent(client: Client, userId: string, body: Record<string, unknown>) {
  const enabled = body.enabled === true ? 1 : 0;
  const length = optionalNumber(body.typicalLengthDays, 15, 90);
  if (length === "invalid") return { error: "Typical cycle length must be 15–90 days, or blank." };
  await client.execute({
    sql: `INSERT INTO cycle_consent (user_id, enabled, typical_length_days, variability, life_context, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            enabled = excluded.enabled,
            typical_length_days = excluded.typical_length_days,
            variability = excluded.variability,
            life_context = excluded.life_context,
            updated_at = excluded.updated_at`,
    args: [userId, enabled, length, text(body.variability, 80), text(body.lifeContext, 200), new Date().toISOString()],
  });
  return { enabled: enabled === 1 };
}

export async function addCycleEntry(client: Client, userId: string, body: Record<string, unknown>) {
  const consent = await client.execute({ sql: "SELECT enabled FROM cycle_consent WHERE user_id = ?", args: [userId] });
  if (Number(consent.rows[0]?.enabled ?? 0) !== 1) return { error: "Cycle tracking is off." };
  const loggedOn = day(body.loggedOn);
  const kind = text(body.kind, 40);
  if (!loggedOn || !["period", "symptom", "note"].includes(kind)) return { error: "A date and entry type are required." };
  const id = randomUUID();
  await client.execute({
    sql: `INSERT INTO cycle_entry (id, user_id, logged_on, kind, flow, symptoms_json, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, loggedOn, kind, text(body.flow, 40) || null, JSON.stringify(Array.isArray(body.symptoms) ? body.symptoms.slice(0, 12) : []), text(body.notes, 500), new Date().toISOString()],
  });
  return { id };
}

export async function deleteCycleData(client: Client, userId: string) {
  await client.execute({ sql: "DELETE FROM cycle_entry WHERE user_id = ?", args: [userId] });
  await client.execute({ sql: "DELETE FROM cycle_consent WHERE user_id = ?", args: [userId] });
}
