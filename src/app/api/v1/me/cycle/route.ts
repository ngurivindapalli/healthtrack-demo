import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { addCycleEntry, deleteCycleData, readCycle, saveCycleConsent } from "@/lib/services/manual-logs";

export const runtime = "nodejs";

export async function GET() {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  return NextResponse.json(await readCycle(client, userId));
}

export async function PUT(request: Request) {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  const { client } = await getDatabase();
  const saved = await saveCycleConsent(client, userId, body);
  if ("error" in saved && typeof saved.error === "string") return apiError(400, "invalid_request", saved.error);
  return NextResponse.json(saved);
}

export async function POST(request: Request) {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError(400, "invalid_json", "Request body must be JSON.");
  }
  const { client } = await getDatabase();
  const created = await addCycleEntry(client, userId, body);
  if ("error" in created && typeof created.error === "string") return apiError(400, "invalid_request", created.error);
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE() {
  const userId = (await requireUser())?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  await deleteCycleData(client, userId);
  return NextResponse.json({ deleted: true });
}
