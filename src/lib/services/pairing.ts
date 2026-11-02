import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { hashSecret } from "@/lib/services/measurements";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PAIRING_TTL_MS = 10 * 60 * 1000;
export const DEVICE_CATEGORIES = ["sleep", "recovery", "activity", "heart"] as const;

export function createPairingCode(): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export async function createPairingSession(client: Client, userId: string) {
  const code = createPairingCode();
  const id = randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS).toISOString();
  await client.execute({
    sql: `UPDATE pairing_session
          SET used_at = ?, expires_at = ?
          WHERE user_id = ? AND used_at IS NULL`,
    args: [nowIso, nowIso, userId],
  });
  await client.execute({
    sql: `INSERT INTO pairing_session (id, user_id, code_hash, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, userId, hashSecret(code), expiresAt, nowIso],
  });
  return { id, code, expiresAt };
}

export async function completePairing(
  client: Client,
  input: { code: string; installationId: string; name: string; platform: string },
): Promise<{ deviceId: string; token: string; categories: string[] } | { error: string }> {
  const row = await client.execute({
    sql: `SELECT id, user_id, expires_at, used_at FROM pairing_session WHERE code_hash = ?`,
    args: [hashSecret(input.code.trim().toUpperCase())],
  });
  const session = row.rows[0];
  if (!session || session.used_at) return { error: "Pairing code is invalid or already used." };
  const now = new Date().toISOString();
  if (String(session.expires_at) <= now) return { error: "Pairing code has expired." };
  const claimed = await client.execute({
    sql: "UPDATE pairing_session SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?",
    args: [now, String(session.id), now],
  });
  if (Number(claimed.rowsAffected) !== 1) return { error: "Pairing code is invalid or already used." };
  const token = randomBytes(32).toString("base64url");
  const deviceId = randomUUID();
  await client.execute({
    sql: `INSERT INTO linked_device (
      id, user_id, name, platform, installation_id, token_hash, categories_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    args: [
      deviceId,
      String(session.user_id),
      input.name.slice(0, 80) || "Companion app",
      input.platform.slice(0, 40) || "unknown",
      input.installationId.slice(0, 120),
      hashSecret(token),
      JSON.stringify(DEVICE_CATEGORIES),
      now,
    ],
  });
  return { deviceId, token, categories: [...DEVICE_CATEGORIES] };
}

export async function revokeDevice(client: Client, userId: string, deviceId: string): Promise<boolean> {
  const result = await client.execute({
    sql: `UPDATE linked_device SET status = 'revoked', revoked_at = ?, token_hash = ?
          WHERE id = ? AND user_id = ? AND status = 'active'`,
    args: [new Date().toISOString(), `revoked-${randomUUID()}`, deviceId, userId],
  });
  return Number(result.rowsAffected) > 0;
}
