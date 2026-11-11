import { apiError, requireUser } from "@/lib/api";
import { demoRuntime } from "@/lib/demo/config";
import { clientKey, rateLimit, sharedAllowance } from "@/lib/rate-limit";
import { parseDailyInsight } from "@/lib/services/daily-insights";
import { completeInsightRequest } from "@/lib/services/coach-groq";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY = 8_000;
const UNAVAILABLE = "Daily insights are temporarily unavailable. Your health dashboard is still available.";

/**
 * Daily insight. Separate from coach chat history.
 * Demo mode does not open a database. The Groq key stays on the server.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const bucket = clientKey(request, `insights:${user.id}`);
  if (!rateLimit(bucket, 4, 600_000) || !rateLimit(`${bucket}:hour`, 12, 3_600_000)) {
    return apiError(429, "rate_limited", "Please wait a moment before refreshing insights.");
  }
  if (demoRuntime() !== "on") {
    const { getDatabase } = await import("@/db");
    const { client } = await getDatabase();
    const decision = await sharedAllowance(client, `insights:${user.id}`, 12, 3_600_000);
    if (decision === "limited") return apiError(429, "rate_limited", "Please wait a moment before refreshing insights.");
    if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", UNAVAILABLE);
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return apiError(413, "payload_too_large", UNAVAILABLE);
  const text = await request.text();
  if (text.length > MAX_BODY) return apiError(413, "payload_too_large", UNAVAILABLE);
  let body: { brief?: unknown };
  try {
    body = JSON.parse(text) as { brief?: unknown };
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  const brief = String(body.brief ?? "").slice(0, 4000);
  if (brief.length < 20) return apiError(400, "invalid_request", "Not enough measurements for daily insights.");

  const result = await completeInsightRequest(brief, {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
  });
  if (!result.ok) return apiError(result.status, "insights_unavailable", UNAVAILABLE);
  const insight = parseDailyInsight(result.content, brief);
  if (!insight) return apiError(502, "insights_unavailable", UNAVAILABLE);
  return NextResponse.json({ insight });
}
