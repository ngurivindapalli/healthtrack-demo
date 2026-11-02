import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { LOG_KINDS, createLog, listLogs, setHydrationTarget, type LogKind } from "@/lib/services/manual-logs";
import { refreshOfficialScore } from "@/lib/services/wellness-score";

export const runtime = "nodejs";

function kindOf(url: string): LogKind | null {
  const kind = new URL(url).searchParams.get("kind");
  return kind && (LOG_KINDS as readonly string[]).includes(kind) ? (kind as LogKind) : null;
}

export async function GET(request: Request) {
  const user = await requireUser();
  const userId = user?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const kind = kindOf(request.url);
  if (!kind) return apiError(400, "invalid_request", "kind must be meal, hydration, sleep, workout, or recovery.");
  const { client } = await getDatabase();
  return NextResponse.json({ kind, records: await listLogs(client, userId, kind) });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const userId = user?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const kind = kindOf(request.url);
  if (!kind) return apiError(400, "invalid_request", "kind must be meal, hydration, sleep, workout, or recovery.");
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 100_000) return apiError(413, "payload_too_large", "Log request is too large.");
  const text = await request.text();
  if (text.length > 100_000) return apiError(413, "payload_too_large", "Log request is too large.");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  const { client } = await getDatabase();
  if (kind === "hydration" && body.targetMilliliters != null) {
    const target = await setHydrationTarget(client, userId, Number(body.targetMilliliters));
    if ("error" in target && typeof target.error === "string") return apiError(400, "invalid_request", target.error);
    await refreshOfficialScore(client, userId);
    return NextResponse.json(target);
  }
  const created = await createLog(client, userId, kind, body);
  if ("error" in created && typeof created.error === "string") return apiError(400, "invalid_request", created.error);
  await refreshOfficialScore(client, userId);
  return NextResponse.json(created, { status: 201 });
}
