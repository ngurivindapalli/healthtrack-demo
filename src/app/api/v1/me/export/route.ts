import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { readCycle } from "@/lib/services/manual-logs";
import { readProfile, rowToProfile } from "@/lib/services/workspace";

export const runtime = "nodejs";

async function rows(client: Awaited<ReturnType<typeof getDatabase>>["client"], sql: string, userId: string) {
  const result = await client.execute({ sql, args: [userId] });
  return result.rows;
}

export async function GET() {
  const user = await requireUser();
  const userId = user?.id;
  if (!userId) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  const profile = await readProfile(client, userId);
  const exportBody = {
    exportedAt: new Date().toISOString(),
    account: { id: userId, email: user?.email ?? null, name: user?.name ?? null },
    profile: profile ? rowToProfile(profile) : null,
    meals: await rows(client, "SELECT * FROM meal_log WHERE user_id = ?", userId),
    hydration: await rows(client, "SELECT * FROM hydration_log WHERE user_id = ?", userId),
    sleep: await rows(client, "SELECT * FROM sleep_log WHERE user_id = ?", userId),
    workouts: await rows(client, "SELECT * FROM workout_log WHERE user_id = ?", userId),
    recovery: await rows(client, "SELECT * FROM recovery_log WHERE user_id = ?", userId),
    cycle: await readCycle(client, userId),
    measurements: await rows(client, "SELECT id, metric, value, unit, start_time, end_time, timezone, ingested_at FROM measurement WHERE user_id = ?", userId),
    wellnessScores: await rows(client, "SELECT score_date, exact_score, display_score, algorithm_version, calculated_at FROM wellness_score WHERE user_id = ?", userId),
  };
  return new NextResponse(JSON.stringify(exportBody, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": "attachment; filename=healthtrack-export.json",
    },
  });
}
