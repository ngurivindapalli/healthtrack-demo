import { demoRuntime } from "@/lib/demo/config";
import { apiError } from "@/lib/api";
import { clientKey, enforceLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function demoBlocked() {
  if (demoRuntime() === "forbidden") {
    return apiError(503, "demo_forbidden", "Demo Mode is disabled on production deployments.");
  }
  if (demoRuntime() === "on") {
    return apiError(404, "demo_auth_disabled", "Real authentication is not available in Demo Mode. Use Explore Demo.");
  }
  return null;
}

async function limitAuthWrites(request: Request) {
  if (request.method !== "POST") return null;
  try {
    const { getDatabase } = await import("@/db");
    const { client } = await getDatabase();
    const decision = await enforceLimit(client, clientKey(request, "auth"), 20, 60_000);
    if (decision === "limited") return apiError(429, "rate_limited", "Too many authentication attempts.");
    if (decision === "unavailable") return apiError(503, "rate_limit_unavailable", "Authentication limiting is unavailable.");
  } catch {
    return apiError(503, "rate_limit_unavailable", "Authentication limiting is unavailable.");
  }
  return null;
}

async function realHandler(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", request: Request) {
  const blocked = demoBlocked();
  if (blocked) return blocked;
  if (method === "POST") {
    const limited = await limitAuthWrites(request);
    if (limited) return limited;
  }
  const { toNextJsHandler } = await import("better-auth/next-js");
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const handlers = toNextJsHandler(auth);
  return handlers[method](request);
}

export function GET(request: Request) {
  return realHandler("GET", request);
}

export function POST(request: Request) {
  return realHandler("POST", request);
}

export function PATCH(request: Request) {
  return realHandler("PATCH", request);
}

export function PUT(request: Request) {
  return realHandler("PUT", request);
}

export function DELETE(request: Request) {
  return realHandler("DELETE", request);
}
