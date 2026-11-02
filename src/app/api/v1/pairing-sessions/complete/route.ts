import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError } from "@/lib/api";
import { completePairing } from "@/lib/services/pairing";
import { clientKey, enforceLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { client } = await getDatabase();
  const decision = await enforceLimit(client, clientKey(request, "pair-complete"), 20, 15 * 60 * 1000);
  if (decision === "limited") return apiError(429, "rate_limited", "Too many pairing attempts.");
  if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Pairing limiting is unavailable.");
  let body: { code?: string; installationId?: string; name?: string; platform?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  if (!body.code?.trim() || !body.installationId?.trim()) {
    return apiError(400, "invalid_request", "code and installationId are required.");
  }
  const result = await completePairing(client, {
    code: body.code,
    installationId: body.installationId,
    name: body.name ?? "Companion app",
    platform: body.platform ?? "unknown",
  });
  if ("error" in result) return apiError(400, "pairing_failed", result.error);
  return NextResponse.json(result, { status: 201 });
}
