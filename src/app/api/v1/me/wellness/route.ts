import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { refreshOfficialScore } from "@/lib/services/wellness-score";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  const userId = user?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  const assessment = await refreshOfficialScore(client, userId);
  if (!assessment.ok) return apiError(400, "invalid_score", assessment.error);
  return NextResponse.json(assessment);
}
