import { apiError, requireUser } from "@/lib/api";
import { demoRuntime } from "@/lib/demo/config";
import { clientKey, rateLimit, sharedAllowance } from "@/lib/rate-limit";
import { insightIssue, parseDailyInsight } from "@/lib/services/daily-insights";
import { completeInsightRequest, type InsightFailureCategory } from "@/lib/services/coach-groq";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY = 8_000;
const UNAVAILABLE = "Daily insights are temporarily unavailable. Your health dashboard is still available.";

function reportInsight(category: InsightFailureCategory) {
  console.info(JSON.stringify({ scope: "insights", category }));
}

/**
 * Daily insight. Separate from coach chat history.
 * Demo mode does not open a database. The Groq key stays on the server.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    reportInsight("authentication_failed");
    return apiError(401, "unauthorized", "Sign in required.");
  }
  const bucket = clientKey(request, `insights:${user.id}`);
  if (!rateLimit(bucket, 4, 600_000) || !rateLimit(`${bucket}:hour`, 12, 3_600_000)) {
    reportInsight("application_rate_limit");
    return apiError(429, "rate_limited", "Please wait a moment before refreshing insights.");
  }
  if (demoRuntime() !== "on") {
    const { getDatabase } = await import("@/db");
    const { client } = await getDatabase();
    const decision = await sharedAllowance(client, `insights:${user.id}`, 12, 3_600_000);
    if (decision === "limited") {
      reportInsight("application_rate_limit");
      return apiError(429, "rate_limited", "Please wait a moment before refreshing insights.");
    }
    if (decision === "unavailable") {
      reportInsight("provider_error");
      return apiError(503, "rate_limit_unavailable", UNAVAILABLE);
    }
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

  const env = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
  };
  const result = await completeInsightRequest(brief, env);
  if (!result.ok) {
    reportInsight(result.category ?? "provider_error");
    return apiError(result.status, "insights_unavailable", UNAVAILABLE);
  }
  let insight = parseDailyInsight(result.content, brief);
  if (!insight) {
    const issue = insightIssue(result.content, brief) ?? "schema_validation_failed";
    const hint = issue === "unsupported_measurement"
      ? "Rewrite the JSON without any quantity that is not supported by the measurements. Describe the pattern in words."
      : "Rewrite one JSON object with the string fields overall, goingWell, attention, and tryToday. Each value is one or two plain sentences.";
    const retry = await completeInsightRequest(`${brief}\n\n${hint}`, env);
    if (!retry.ok) {
      reportInsight(retry.category ?? "provider_error");
      return apiError(retry.status, "insights_unavailable", UNAVAILABLE);
    }
    insight = parseDailyInsight(retry.content, brief);
    if (!insight) reportInsight(insightIssue(retry.content, brief) ?? issue);
  }
  if (!insight) return apiError(502, "insights_unavailable", UNAVAILABLE);
  return NextResponse.json({ insight });
}
