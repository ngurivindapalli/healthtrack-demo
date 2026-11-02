import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { createPairingSession } from "@/lib/services/pairing";
import { clientKey, enforceLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  const decision = await enforceLimit(client, clientKey(request, "pair"), 10, 15 * 60 * 1000);
  if (decision === "limited") return apiError(429, "rate_limited", "Too many pairing codes. Try again later.");
  if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Pairing limiting is unavailable.");
  const session = await createPairingSession(client, user.id);
  return NextResponse.json(session, { status: 201 });
}
