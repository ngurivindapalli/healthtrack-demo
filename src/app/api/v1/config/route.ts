import { NextResponse } from "next/server";
import { emailDeliveryConfigured, googleSignInConfigured } from "@/lib/email";
import { API_VERSION } from "@/lib/services/measurements";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    apiVersion: API_VERSION,
    emailDelivery: emailDeliveryConfigured(),
    googleSignIn: googleSignInConfigured(),
    companionAppAvailable: false,
  });
}
