import { NextResponse } from "next/server";
import { demoRuntime } from "@/lib/demo/config";
import { assessDemoData, createDemoData } from "@/lib/demo/data";

export const runtime = "nodejs";

function blocked() {
  const runtime = demoRuntime();
  if (runtime === "forbidden") {
    return NextResponse.json(
      { error: { code: "demo_forbidden", message: "Demo Mode is disabled on production deployments." } },
      { status: 503 },
    );
  }
  if (runtime !== "on") {
    return NextResponse.json(
      { error: { code: "demo_disabled", message: "Demo Mode is not enabled on this server." } },
      { status: 404 },
    );
  }
  return null;
}

export function GET(request: Request) {
  const denied = blocked();
  if (denied) return denied;
  const path = request.headers.get("x-healthtrack-demo-path") ?? new URL(request.url).pathname;
  const pathname = path.split("?")[0] ?? path;
  if (pathname === "/api/health") return NextResponse.json({ ok: true, database: "demo" });
  if (pathname === "/api/v1/me/workspace") return NextResponse.json(createDemoData().workspace);
  if (pathname === "/api/v1/me/wellness") {
    const assessment = assessDemoData(createDemoData());
    return NextResponse.json(assessment);
  }
  if (pathname === "/api/v1/me/cycle") return NextResponse.json(createDemoData().cycle);
  return NextResponse.json(
    { error: { code: "demo_browser", message: "Demo changes are saved in this browser and were not written on the server." } },
    { status: 409 },
  );
}

export function POST() {
  const denied = blocked();
  if (denied) return denied;
  return NextResponse.json(
    { error: { code: "demo_browser", message: "Demo changes are saved in this browser and were not written on the server." } },
    { status: 409 },
  );
}

export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
