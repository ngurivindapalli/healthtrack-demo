import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { enforceLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BODY = 20_000;

interface Body {
  question?: string;
  fallback?: { content?: string };
}

/**
 * Optional wording layer for the signed-in account. The client already computed
 * a deterministic answer. This route does not read health records, cycle entries, or labs.
 */
export async function POST(request: Request) {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  const decision = await enforceLimit(client, `coach:${userId}`, 20, 60_000);
  if (decision === "limited") return apiError(429, "rate_limited", "Too many coach requests.");
  if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Coach limiting is unavailable.");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return apiError(413, "payload_too_large", "Coach request is too large.");
  const text = await request.text();
  if (text.length > MAX_BODY) return apiError(413, "payload_too_large", "Coach request is too large.");
  let body: Body;
  try {
    body = JSON.parse(text) as Body;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }

  const fallback = String(body.fallback?.content ?? "").slice(0, 4000);
  if (!fallback) return apiError(400, "invalid_request", "Missing engine fallback.");
  const question = String(body.question ?? "").slice(0, 500);

  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ content: fallback, usedLiveModel: false });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are HealthTrack's wellness coach. Rewrite the provided engine answer more clearly. Do not add medical diagnoses, do not invent numbers, do not create extra action lists. Meal logging and calorie matching are tracking progress, not proof of nutritional health. Stay general-wellness.",
          },
          {
            role: "user",
            content: `Question: ${question}\n\nEngine answer:\n${fallback}`,
          },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json({ content: fallback, usedLiveModel: false });
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({
      content: content || fallback,
      usedLiveModel: Boolean(content),
    });
  } catch {
    return NextResponse.json({ content: fallback, usedLiveModel: false });
  }
}
