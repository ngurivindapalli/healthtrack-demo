import { NextResponse } from "next/server";

interface Body {
  question?: string;
  fallback?: { content: string; sources?: string[]; safetyFlag?: boolean };
}

/**
 * Optional wording layer. The client already computed a deterministic answer
 * from the status engine. If OPENAI_API_KEY is absent, we return that answer.
 * If present, we may rewrite tone while keeping the facts.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fallback = body.fallback?.content;
  if (!fallback) {
    return NextResponse.json(
      { error: "Missing engine fallback", usedLiveModel: false },
      { status: 400 },
    );
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({
      content: fallback,
      usedLiveModel: false,
    });
  }

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
              "You are HealthTrack's 1.0 wellness coach. Rewrite the provided engine answer more clearly. Do not add medical diagnoses, do not invent numbers, do not create extra action lists. Keep association vs causation language. Stay general-wellness.",
          },
          {
            role: "user",
            content: `Question: ${body.question ?? ""}\n\nEngine answer:\n${fallback}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ content: fallback, usedLiveModel: false });
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({
      content: content || fallback,
      usedLiveModel: Boolean(content),
    });
  } catch {
    return NextResponse.json({ content: fallback, usedLiveModel: false });
  }
}
