import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDatabase, migrate } from "@/db";
import { createBlankCustomState } from "@/lib/data/ram";
import { buildAppModel } from "@/lib/engines/view-model";
import { applyBatch, findDeviceByToken, observationsForUser, validateMeasurement } from "@/lib/services/measurements";
import { completePairing, createPairingSession, revokeDevice } from "@/lib/services/pairing";

async function database() {
  const opened = createDatabase(":memory:");
  await migrate(opened.client);
  const now = Date.now();
  for (const [id, email] of [
    ["user-a", "a@example.com"],
    ["user-b", "b@example.com"],
  ] as const) {
    await opened.client.execute({
      sql: `INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)`,
      args: [id, id, email, now, now],
    });
  }
  return opened.client;
}

describe("health data contract", () => {
  it("rejects a bad unit and a missing source id", () => {
    const unit = validateMeasurement(
      { sourceRecordId: "s1", metric: "steps", value: 10, unit: "min", startTime: "2026-10-16T12:00:00Z" },
      0,
    );
    assert.equal(unit.ok, false);
    const missing = validateMeasurement(
      { metric: "steps", value: 10, unit: "count", startTime: "2026-10-16T12:00:00Z" },
      0,
    );
    assert.equal(missing.ok, false);
  });

  it("pairs once, expires, uploads idempotently, and isolates users", async () => {
    const client = await database();
    const session = await createPairingSession(client, "user-a");
    const paired = await completePairing(client, {
      code: session.code.toLowerCase(),
      installationId: "install-1",
      name: "Noel's phone",
      platform: "ios",
    });
    if (!("token" in paired)) throw new Error(paired.error);
    const replay = await completePairing(client, {
      code: session.code,
      installationId: "install-2",
      name: "Second",
      platform: "ios",
    });
    assert.ok("error" in replay);

    const expired = await createPairingSession(client, "user-b");
    await client.execute({
      sql: "UPDATE pairing_session SET expires_at = ? WHERE id = ?",
      args: ["2020-01-01T00:00:00.000Z", expired.id],
    });
    const expiredResult = await completePairing(client, {
      code: expired.code,
      installationId: "install-b",
      name: "Other phone",
      platform: "android",
    });
    assert.ok("error" in expiredResult);

    const device = await findDeviceByToken(client, paired.token);
    assert.equal(device?.userId, "user-a");
    const record = {
      sourceRecordId: "steps-1",
      metric: "steps",
      value: 1200,
      unit: "count",
      startTime: "2026-10-16T15:00:00Z",
      timezone: "America/New_York",
    };
    const first = await applyBatch(client, { id: paired.deviceId, userId: "user-a" }, [record, { ...record, unit: "min", sourceRecordId: "bad" }], "batch-1");
    assert.equal(first.accepted, 1);
    assert.equal(first.rejected.length, 1);
    const retry = await applyBatch(client, { id: paired.deviceId, userId: "user-a" }, [], "batch-1");
    assert.equal(retry.replayed, true);
    assert.equal(retry.accepted, 1);
    const duplicate = await applyBatch(client, { id: paired.deviceId, userId: "user-a" }, [record], "batch-2");
    assert.equal(duplicate.duplicates, 1);
    assert.equal(duplicate.accepted, 0);

    const own = await observationsForUser(client, "user-a", "America/New_York");
    const other = await observationsForUser(client, "user-b", "America/New_York");
    assert.equal(own.length, 1);
    assert.equal(own[0]?.steps, 1200);
    assert.equal(own[0]?.sleepHours, null);
    assert.equal(other.length, 0);

    const kept = await client.execute("SELECT COUNT(*) AS count FROM measurement WHERE user_id = 'user-a'");
    assert.equal(await revokeDevice(client, "user-a", paired.deviceId), true);
    const after = await client.execute("SELECT COUNT(*) AS count FROM measurement WHERE user_id = 'user-a'");
    assert.equal(String(after.rows[0]?.count), String(kept.rows[0]?.count));
    assert.equal(await findDeviceByToken(client, paired.token), null);
  });

  it("invalidates an unused code when a replacement is created", async () => {
    const client = await database();
    const first = await createPairingSession(client, "user-a");
    const second = await createPairingSession(client, "user-a");
    const stale = await completePairing(client, {
      code: first.code,
      installationId: "install-stale",
      name: "Old",
      platform: "ios",
    });
    assert.ok("error" in stale);
    const fresh = await completePairing(client, {
      code: second.code,
      installationId: "install-fresh",
      name: "New",
      platform: "ios",
    });
    assert.ok("token" in fresh);
  });

  it("does not treat a missing dashboard history as sample data", () => {
    const state = { ...createBlankCustomState(), mode: "account" as const, persistedObservations: [], devices: [] };
    const model = buildAppModel(state);
    assert.equal(model.sampleData, false);
    assert.equal(model.coldStart, true);
    assert.equal(model.freshness.kind, "disconnected");
    assert.equal(model.observations.length, 0);
    assert.equal(model.todayOne, null);
    assert.match(model.status.summary, /not enough stored measurements/i);
  });

  it("can migrate twice without dropping isolation", async () => {
    const client = await database();
    await migrate(client);
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE name = 'measurement'");
    assert.equal(tables.rows.length, 1);
  });
});
