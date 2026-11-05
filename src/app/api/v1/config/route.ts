import { NextResponse } from "next/server";
import { demoRuntime, isDemoMode } from "@/lib/demo/config";
import { emailDeliveryConfigured, googleSignInConfigured } from "@/lib/email";
import { API_VERSION } from "@/lib/services/measurements";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    apiVersion: API_VERSION,
    emailDelivery: emailDeliveryConfigured(),
    googleSignIn: googleSignInConfigured(),
    companionAppAvailable: false,
    demoMode: isDemoMode(),
    demoForbidden: demoRuntime() === "forbidden",
  });
}
