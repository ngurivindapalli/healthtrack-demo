import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { createDatabase, migrate } from "@/db";
import { sendTransactionalEmail } from "@/lib/email";
import { assertSafeEmailLink, safeNextPath } from "@/lib/links";
import { assertProductionAuth, assertProductionDatabase } from "@/lib/production-env";
import { clientKey, rateLimit, sharedAllowance } from "@/lib/rate-limit";
import {
  addCycleEntry,
  createLog,
  cycleContextForAuthorizedUse,
  deleteCycleData,
  listLogs,
  saveCycleConsent,
  setHydrationTarget,
  updateLog,
} from "@/lib/services/manual-logs";
import { localDate, deleteHealthData } from "@/lib/services/workspace";
import { PERSONAL_BASELINE_MESSAGE, listOfficialScores, refreshOfficialScore } from "@/lib/services/wellness-score";

async function database() {
  const opened = createDatabase(":memory:");
  await migrate(opened.client);
  const now = Date.now();
  for (const [id, email] of [
    ["fixture-a", "fixture-a@example.test"],
    ["fixture-b", "fixture-b@example.test"],
  ] as const) {
    await opened.client.execute({
      sql: "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
      args: [id, "Fixture Account", email, now, now],
    });
  }
  return opened.client;
}

function shift(day: string, delta: number) {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

describe("production readiness", () => {
  it("rejects ephemeral SQLite and a non-https production auth URL", () => {
    assert.doesNotThrow(() => assertProductionDatabase("file:data/healthtrack.db", { NODE_ENV: "production", VERCEL: undefined }));
    assert.throws(() => assertProductionDatabase("file:data/healthtrack.db", { NODE_ENV: "production", VERCEL: "1" }));
    assert.throws(() => assertProductionDatabase("libsql://example.turso.io", { NODE_ENV: "production", VERCEL: "1" }));
    assert.doesNotThrow(() => assertProductionDatabase("libsql://example.turso.io", { NODE_ENV: "production", VERCEL: "1", DATABASE_AUTH_TOKEN: "present" }));
    assert.throws(() => assertProductionAuth({ NODE_ENV: "production", BETTER_AUTH_SECRET: "secret", BETTER_AUTH_URL: "http://localhost:3000" }));
    assert.doesNotThrow(() => assertProductionAuth({ NODE_ENV: "production", BETTER_AUTH_SECRET: "secret", BETTER_AUTH_URL: "https://app.example.com" }));
    assert.doesNotThrow(() => assertProductionAuth({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }));
  });

  it("does not let a caller choose a fresh rate-limit bucket", () => {
    const request = new Request("http://localhost/api", { headers: { "x-forwarded-for": "203.0.113.10", "x-real-ip": "198.51.100.20" } });
    const spoofed = new Request("http://localhost/api", { headers: { "x-forwarded-for": "203.0.113.10" } });
    const previous = process.env.VERCEL;
    const trust = process.env.TRUST_PROXY;
    delete process.env.VERCEL;
    delete process.env.TRUST_PROXY;
    assert.equal(clientKey(request, "ingest"), "ingest:shared");
    process.env.VERCEL = "1";
    assert.equal(clientKey(request, "ingest"), "ingest:198.51.100.20");
    assert.equal(clientKey(spoofed, "ingest"), "ingest:shared");
    if (previous == null) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
    if (trust == null) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = trust;
    assert.equal(rateLimit("readiness-test", 1, 60_000), true);
    assert.equal(rateLimit("readiness-test", 1, 60_000), false);
  });

  it("applies each migration once and shares a database rate limit", async () => {
    const opened = createDatabase(":memory:");
    const first = await migrate(opened.client);
    await opened.client.execute({
      sql: "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('keep-me', 'Fixture', 'keep@example.test', 1, 1, 1)",
    });
    const second = await migrate(opened.client);
    const kept = await opened.client.execute({ sql: "SELECT id FROM user WHERE id = ?", args: ["keep-me"] });
    const versions = await opened.client.execute("SELECT version FROM schema_migration ORDER BY version");
    assert.deepEqual(first, ["0001_baseline", "0002_scoring_columns", "0003_rate_limit"]);
    assert.deepEqual(second, []);
    assert.equal(versions.rows.length, 3);
    assert.equal(String(kept.rows[0]?.id), "keep-me");
    assert.equal(await sharedAllowance(opened.client, "db-shared", 1, 60_000), "ok");
    assert.equal(await sharedAllowance(opened.client, "db-shared", 1, 60_000), "limited");
    assert.equal(safeNextPath("//evil.example"), "/today");
    assert.equal(safeNextPath("/today"), "/today");
    assert.throws(() => assertSafeEmailLink("https://evil.example/reset", "https://app.example"));
    assert.doesNotThrow(() => assertSafeEmailLink("https://app.example/reset-password?token=fixture", "https://app.example"));
    const savedKey = process.env.RESEND_API_KEY;
    const savedFrom = process.env.EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    await assert.rejects(() => sendTransactionalEmail({ to: "fixture@example.test", subject: "fixture", text: "not sent" }));
    if (savedKey == null) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
    if (savedFrom == null) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = savedFrom;
  });

  it("keeps a fixture record after the database connection is reopened", async () => {
    const file = path.join(os.tmpdir(), `healthtrack-readiness-${Date.now()}.db`);
    const url = `file:${file.replaceAll("\\", "/")}`;
    const first = createDatabase(url);
    await migrate(first.client);
    const now = new Date().toISOString();
    await first.client.execute({
      sql: "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('fixture-file', 'Fixture', 'file@example.test', 1, ?, ?)",
      args: [now, now],
    });
    await createLog(first.client, "fixture-file", "meal", { loggedOn: "2026-11-01", name: "FIXTURE meal not a patient record", calories: 111 });
    await first.client.close();
    const second = createDatabase(url);
    const rows = await second.client.execute({ sql: "SELECT name, calories FROM meal_log WHERE user_id = ?", args: ["fixture-file"] });
    assert.equal(String(rows.rows[0]?.name), "FIXTURE meal not a patient record");
    assert.equal(Number(rows.rows[0]?.calories), 111);
    await second.client.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        fs.rmSync(`${file}${suffix}`, { force: true });
      } catch {
        // Windows can keep the handle briefly after close. The assertion above already confirmed the row.
      }
    }
  });

  it("runs the scoring journey for one fixture account and keeps the other empty", async () => {
    const client = await database();
    const today = localDate(new Date().toISOString(), "UTC");
    await client.execute({
      sql: "INSERT INTO member_profile (user_id, timezone, typical_bedtime, workspace_json) VALUES (?, 'UTC', '22:30', ?)",
      args: ["fixture-a", JSON.stringify({ scoringGoals: { mealTarget: 1, calorieGoal: 111, sleepHoursGoal: 8, activityKind: "active_minutes", activityGoal: 30, sources: { hydration: null, sleep: null, activity: null } } })],
    });
    const meal = await createLog(client, "fixture-a", "meal", { loggedOn: today, name: "FIXTURE meal not a patient record", calories: 111 });
    await createLog(client, "fixture-a", "hydration", { loggedOn: today, milliliters: 250 });
    await setHydrationTarget(client, "fixture-a", 250);
    await createLog(client, "fixture-a", "recovery", { loggedOn: today, energy: 8, fatigue: 2, soreness: 0, stress: 9 });
    for (const delta of [0, -1, -2, -3, -4]) {
      const day = shift(today, delta);
      await createLog(client, "fixture-a", "sleep", { startTime: `${day}T22:30:00.000Z`, endTime: `${shift(today, delta + 1)}T06:30:00.000Z` });
      await createLog(client, "fixture-a", "workout", { startedAt: `${day}T15:00:00.000Z`, name: "FIXTURE walk", minutes: 30 });
    }
    const scored = await refreshOfficialScore(client, "fixture-a");
    assert.equal(scored.ok && scored.displayScore != null, true);
    assert.equal(scored.ok && scored.personalComparison.message, PERSONAL_BASELINE_MESSAGE);
    assert.equal(scored.ok && scored.labsAffectScore, false);
    assert.equal(scored.ok && scored.cycleAffectsScore, false);
    if (!("id" in meal) || !meal.id) throw new Error("fixture meal was not saved");
    await updateLog(client, "fixture-a", "meal", meal.id, { loggedOn: today, name: "FIXTURE meal edited", calories: 0 });
    const edited = await refreshOfficialScore(client, "fixture-a");
    assert.equal(edited.ok && edited.exactScore !== (scored.ok ? scored.exactScore : null), true);
    await client.execute({
      sql: `INSERT INTO wellness_score (id, user_id, score_date, exact_score, display_score, algorithm_version, provenance_json, calculated_at)
            VALUES ('fixture-history', 'fixture-a', ?, 70, 70, 'wellness-v1.0', '{}', ?)`,
      args: [shift(today, -1), `${shift(today, -1)}T12:00:00.000Z`],
    });
    const persisted = await refreshOfficialScore(client, "fixture-a");
    const history = await listOfficialScores(client, "fixture-a");
    assert.equal(history.some((point) => point.scoreDate === shift(today, -1) && point.exactScore === 70), true);
    assert.equal(history.some((point) => point.scoreDate === today), true);
    await client.execute({ sql: "DELETE FROM recovery_log WHERE user_id = ?", args: ["fixture-a"] });
    const three = await refreshOfficialScore(client, "fixture-a");
    assert.equal(three.ok && three.exactScore != null, true);
    assert.equal(three.ok && three.eligiblePillars.includes("recovery"), false);
    assert.notEqual(three.ok && three.exactScore, persisted.ok && persisted.exactScore);
    await saveCycleConsent(client, "fixture-a", { enabled: true, typicalLengthDays: 28 });
    await addCycleEntry(client, "fixture-a", { loggedOn: today, kind: "note", notes: "FIXTURE cycle note" });
    const withCycle = await refreshOfficialScore(client, "fixture-a");
    await saveCycleConsent(client, "fixture-a", { enabled: false });
    assert.equal(await cycleContextForAuthorizedUse(client, "fixture-a"), null);
    const withoutCycle = await refreshOfficialScore(client, "fixture-a");
    assert.equal(withoutCycle.ok && withoutCycle.exactScore, withCycle.ok && withCycle.exactScore);
    await deleteCycleData(client, "fixture-a");
    const otherMeals = await listLogs(client, "fixture-b", "meal");
    assert.equal(Array.isArray(otherMeals) && otherMeals.length, 0);
    await deleteHealthData(client, "fixture-a");
    const remaining = await client.execute({ sql: "SELECT COUNT(*) AS count FROM meal_log WHERE user_id = ?", args: ["fixture-a"] });
    const scores = await listOfficialScores(client, "fixture-a");
    assert.equal(Number(remaining.rows[0]?.count), 0);
    assert.equal(scores.length, 0);
  });
});
