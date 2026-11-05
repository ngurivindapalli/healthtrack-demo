import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { DEMO_COOKIE, DEMO_USER, demoRuntime } from "@/lib/demo/config";

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function requireUser() {
  const runtime = demoRuntime();
  if (runtime === "forbidden") return null;
  if (runtime === "on") {
    const cookie = (await headers()).get("cookie") ?? "";
    if (!cookie.includes(`${DEMO_COOKIE}=active`)) return null;
    return { ...DEMO_USER };
  }
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session.user;
}
