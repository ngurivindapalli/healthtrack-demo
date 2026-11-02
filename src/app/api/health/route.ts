import { NextResponse } from "next/server";
import { getDatabase } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { client } = await getDatabase();
    await client.execute("SELECT 1");
    return NextResponse.json({ ok: true, database: "up" });
  } catch {
    return NextResponse.json({ ok: false, database: "down" }, { status: 503 });
  }
}
