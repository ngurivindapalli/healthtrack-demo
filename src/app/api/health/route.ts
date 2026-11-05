import { NextResponse } from "next/server";
import { getDatabase } from "@/db";
import { demoRuntime } from "@/lib/demo/config";

export const runtime = "nodejs";

export async function GET() {
  const runtime = demoRuntime();
  if (runtime === "forbidden") {
    return NextResponse.json({ ok: false, database: "disabled", demoMode: "forbidden" }, { status: 503 });
  }
  if (runtime === "on") return NextResponse.json({ ok: true, database: "demo" });
  try {
    const { client } = await getDatabase();
    await client.execute("SELECT 1");
    return NextResponse.json({ ok: true, database: "up" });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
