import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { LOG_KINDS, deleteLog, updateLog, type LogKind } from "@/lib/services/manual-logs";
import { refreshOfficialScore } from "@/lib/services/wellness-score";

export const runtime = "nodejs";

function kindOf(url: string): LogKind | null {
  const kind = new URL(url).searchParams.get("kind");
  return kind && (LOG_KINDS as readonly string[]).includes(kind) ? (kind as LogKind) : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const kind = kindOf(request.url);
  if (!kind) return apiError(400, "invalid_request", "kind is required.");
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  const { client } = await getDatabase();
  const result = await updateLog(client, userId, kind, id, body);
  if ("error" in result && typeof result.error === "string") return apiError(400, "invalid_request", result.error);
  await refreshOfficialScore(client, userId);
  return NextResponse.json(result);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const kind = kindOf(request.url);
  if (!kind) return apiError(400, "invalid_request", "kind is required.");
  const { id } = await context.params;
  const { client } = await getDatabase();
  const removed = await deleteLog(client, userId, kind, id);
  if (!removed) return apiError(404, "not_found", "Record was not found for this account.");
  await refreshOfficialScore(client, userId);
  return NextResponse.json({ deleted: true });
}
