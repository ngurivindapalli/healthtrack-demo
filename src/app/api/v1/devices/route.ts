import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { listDevices } from "@/lib/services/workspace";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const { client } = await getDatabase();
  return NextResponse.json({ devices: await listDevices(client, user.id) });
}
