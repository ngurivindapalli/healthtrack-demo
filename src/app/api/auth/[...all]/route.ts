import { toNextJsHandler } from "better-auth/next-js";
import { getDatabase } from "@/db";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { clientKey, enforceLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const handlers = toNextJsHandler(auth);

async function limitAuthWrites(request: Request) {
  if (request.method !== "POST") return null;
  try {
    const { client } = await getDatabase();
    const decision = await enforceLimit(client, clientKey(request, "auth"), 20, 60_000);
    if (decision === "limited") return apiError(429, "rate_limited", "Too many authentication attempts.");
    if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Authentication limiting is unavailable.");
  } catch {
    return apiError(503, "rate_limit_unavailable", "Authentication limiting is unavailable.");
  }
  return null;
}

export async function GET(request: Request) {
  return handlers.GET(request);
}

export async function POST(request: Request) {
  const blocked = await limitAuthWrites(request);
  if (blocked) return blocked;
  return handlers.POST(request);
}

export async function PATCH(request: Request) {
  return handlers.PATCH(request);
}

export async function PUT(request: Request) {
  return handlers.PUT(request);
}

export async function DELETE(request: Request) {
  return handlers.DELETE(request);
}
