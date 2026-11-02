import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError } from "@/lib/api";
import { findDeviceByToken } from "@/lib/services/measurements";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return apiError(401, "unauthorized", "A device token is required.");
  const { client } = await getDatabase();
  const device = await findDeviceByToken(client, token);
  if (!device) return apiError(401, "unauthorized", "Device token is unknown or revoked.");
  const deviceRow = await client.execute({
    sql: "SELECT last_sync_at, status FROM linked_device WHERE id = ?",
    args: [device.id],
  });
  const latest = await client.execute({
    sql: `SELECT id, status, accepted, duplicates, rejected, created_at
          FROM sync_batch WHERE device_id = ? ORDER BY created_at DESC LIMIT 1`,
    args: [device.id],
  });
  const batch = latest.rows[0];
  return NextResponse.json({
    deviceId: device.id,
    status: String(deviceRow.rows[0]?.status ?? "active"),
    lastSyncAt: deviceRow.rows[0]?.last_sync_at ? String(deviceRow.rows[0].last_sync_at) : null,
    latestBatch: batch
      ? {
          id: String(batch.id),
          status: String(batch.status),
          accepted: Number(batch.accepted),
          duplicates: Number(batch.duplicates),
          rejected: Number(batch.rejected),
          createdAt: String(batch.created_at),
        }
      : null,
  });
}
