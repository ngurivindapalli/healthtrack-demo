import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { apiError, requireUser } from "@/lib/api";
import { revokeDevice } from "@/lib/services/pairing";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const user = await requireUser();
  if (!user) return apiError(401, "unauthorized", "Sign in required.");
  const { deviceId } = await context.params;
  const { client } = await getDatabase();
  const revoked = await revokeDevice(client, user.id, deviceId);
  if (!revoked) return apiError(404, "not_found", "No active device with that id belongs to this account.");
  return NextResponse.json({
    ok: true,
    deletedMeasurements: false,
    message: "The device token was revoked. Measurements already stored were kept.",
  });
}
