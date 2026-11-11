import { apiError, requireUser } from "@/lib/api";
import { demoRuntime } from "@/lib/demo/config";
import { clientKey, rateLimit, sharedAllowance } from "@/lib/rate-limit";
import { completeCoachTurn } from "@/lib/services/coach-groq";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY = 16_000;

/**
 * Server-side coach. Demo mode does not open a database.
 * The Groq key is read only here and is never returned to the browser.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const bucket = clientKey(request, `coach:${user.id}`);
  if (!rateLimit(bucket, 8, 60_000) || !rateLimit(`${bucket}:hour`, 30, 3_600_000)) {
    return apiError(429, "rate_limited", "Too many coach requests. Please wait a moment.");
  }
  if (demoRuntime() !== "on") {
    const { getDatabase } = await import("@/db");
    const { client } = await getDatabase();
    const decision = await sharedAllowance(client, `coach:${user.id}`, 20, 60_000);
    if (decision === "limited") return apiError(429, "rate_limited", "Too many coach requests. Please wait a moment.");
    if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Coach limiting is unavailable.");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return apiError(413, "payload_too_large", "Coach request is too large.");
  const text = await request.text();
  if (text.length > MAX_BODY) return apiError(413, "payload_too_large", "Coach request is too large.");
  let body: { question?: unknown; history?: unknown; context?: unknown };
  try {
    body = JSON.parse(text) as { question?: unknown; history?: unknown; context?: unknown };
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }

  const result = await completeCoachTurn(
    {
      question: String(body.question ?? ""),
      history: body.history,
      context: String(body.context ?? ""),
    },
    { GROQ_API_KEY: process.env.GROQ_API_KEY, GROQ_MODEL: process.env.GROQ_MODEL },
  );
  if (!result.ok) return apiError(result.status, result.status === 400 ? "invalid_request" : "coach_unavailable", result.message);
  return NextResponse.json({ content: result.content });
}
