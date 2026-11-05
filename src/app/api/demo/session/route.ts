import { NextResponse } from "next/server";
import { DEMO_COOKIE, demoRuntime } from "@/lib/demo/config";

export const runtime = "nodejs";

function forbidden() {
  return NextResponse.json(
    { error: { code: "demo_forbidden", message: "Demo Mode is disabled on production deployments." } },
    { status: 503 },
  );
}

function unavailable() {
  return NextResponse.json(
    { error: { code: "demo_disabled", message: "Demo Mode is not enabled on this server." } },
    { status: 404 },
  );
}

export function POST() {
  const runtime = demoRuntime();
  if (runtime === "forbidden") return forbidden();
  if (runtime !== "on") return unavailable();
  const response = NextResponse.json({
    user: { name: "Demo User", email: "demo@healthtrack.example" },
    persistence: "browser",
  });
  response.cookies.set(DEMO_COOKIE, "active", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.VERCEL === "1",
  });
  return response;
}

export function DELETE() {
  const runtime = demoRuntime();
  if (runtime === "forbidden") return forbidden();
  if (runtime !== "on") return unavailable();
  const response = NextResponse.json({ ended: true });
  response.cookies.set(DEMO_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
