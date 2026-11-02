import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError } from "@/lib/api";
import { applyBatch, findDeviceByToken, MAX_BATCH, type IncomingMeasurement } from "@/lib/services/measurements";
import { clientKey, enforceLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { client } = await getDatabase();
  const decision = await enforceLimit(client, clientKey(request, "ingest"), 60, 60 * 1000);
  if (decision === "limited") return apiError(429, "rate_limited", "Too many measurement uploads.");
  if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Upload limiting is unavailable.");
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return apiError(401, "unauthorized", "A device token is required.");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 1_000_000) return apiError(413, "payload_too_large", "Batch must be 1 MB or smaller.");
  let body: { measurements?: IncomingMeasurement[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  if (!Array.isArray(body.measurements)) {
    return apiError(400, "invalid_request", "measurements must be an array.");
  }
  if (body.measurements.length > MAX_BATCH) {
    return apiError(400, "batch_too_large", `A batch can contain at most ${MAX_BATCH} measurements.`);
  }
  const device = await findDeviceByToken(client, token);
  if (!device) return apiError(401, "unauthorized", "Device token is unknown or revoked.");
  const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 120) || "";
  if (!idempotencyKey) {
    return apiError(400, "missing_idempotency_key", "Idempotency-Key is required.");
  }
  const result = await applyBatch(client, device, body.measurements, idempotencyKey);
  return NextResponse.json(result);
}
