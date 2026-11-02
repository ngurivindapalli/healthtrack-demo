import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { deleteHealthData } from "@/lib/services/workspace";

export const runtime = "nodejs";

export async function DELETE() {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  await deleteHealthData(client, user.id);
  return NextResponse.json({ ok: true });
}
